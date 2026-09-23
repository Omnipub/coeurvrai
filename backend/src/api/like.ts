import { Router } from 'express';
import { z } from 'zod';
import type { Server } from 'socket.io';
import { pool, withTransaction } from '../utils/db';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { findActiveMatchForUser, isBlocked } from '../db/queries';
import { compatibleAccountType } from '../models/types';
import { PROFILE_TABLE } from '../services/profiles';

const router = Router();
router.use(requireAuth);

const uuid = z.string().uuid();

/**
 * POST /api/likes/:userId — like un profil.
 * Si le like est réciproque, un match est créé et les deux membres
 * sont notifiés en temps réel (événement socket `match:new`).
 */
router.post(
  '/:userId',
  rateLimit('like', 200, 24 * 60 * 60),
  asyncHandler(async (req, res) => {
    const { sub, accountType } = req.user!;
    const targetId = uuid.parse(req.params.userId);
    if (targetId === sub) throw new HttpError(400, 'Action impossible');

    const { rows: targets } = await pool.query<{ account_type: string }>(
      `SELECT account_type FROM users WHERE id = $1 AND status = 'active'`,
      [targetId],
    );
    if (!targets[0] || targets[0].account_type !== compatibleAccountType(accountType)) {
      throw new HttpError(404, 'Profil introuvable');
    }
    if (await isBlocked(sub, targetId)) throw new HttpError(404, 'Profil introuvable');

    const matchId = await withTransaction(async (client) => {
      await client.query(
        'INSERT INTO likes (liker_id, liked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [sub, targetId],
      );

      const reciprocal = await client.query(
        'SELECT 1 FROM likes WHERE liker_id = $1 AND liked_id = $2',
        [targetId, sub],
      );
      if (!reciprocal.rowCount) return null;

      const [userA, userB] = sub < targetId ? [sub, targetId] : [targetId, sub];
      const { rows } = await client.query<{ id: string; unmatched_at: Date | null }>(
        `INSERT INTO matches (user_a, user_b) VALUES ($1, $2)
         ON CONFLICT (user_a, user_b) DO UPDATE SET unmatched_at = matches.unmatched_at
         RETURNING id, unmatched_at`,
        [userA, userB],
      );
      // Un match rompu ne se recrée pas automatiquement.
      return rows[0].unmatched_at ? null : rows[0].id;
    });

    if (matchId) {
      const io = req.app.get('io') as Server | undefined;
      io?.to(`user:${sub}`).to(`user:${targetId}`).emit('match:new', { matchId });
    }

    res.status(201).json({ matched: Boolean(matchId), matchId });
  }),
);

/** DELETE /api/likes/:userId — retire un like (sans effet sur un match existant). */
router.delete(
  '/:userId',
  asyncHandler(async (req, res) => {
    const targetId = uuid.parse(req.params.userId);
    await pool.query('DELETE FROM likes WHERE liker_id = $1 AND liked_id = $2', [
      req.user!.sub,
      targetId,
    ]);
    res.status(204).end();
  }),
);

/** GET /api/likes/matches — liste des matchs actifs avec aperçu du dernier message. */
router.get(
  '/matches',
  asyncHandler(async (req, res) => {
    const { sub, accountType } = req.user!;
    const otherTable = PROFILE_TABLE[compatibleAccountType(accountType)];

    const { rows } = await pool.query(
      `SELECT m.id AS match_id, m.created_at,
              o.id AS user_id, o.verified_badge, p.display_name, p.photos,
              last.content AS last_message, last.created_at AS last_message_at
         FROM matches m
         JOIN users o ON o.id = CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END
         JOIN ${otherTable} p ON p.user_id = o.id
         LEFT JOIN LATERAL (
           SELECT content, created_at FROM messages
            WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1
         ) last ON true
        WHERE (m.user_a = $1 OR m.user_b = $1)
          AND m.unmatched_at IS NULL
          AND o.status = 'active'
        ORDER BY COALESCE(last.created_at, m.created_at) DESC`,
      [sub],
    );

    res.json({
      matches: rows.map((r) => ({
        matchId: r.match_id,
        createdAt: r.created_at,
        user: {
          id: r.user_id,
          displayName: r.display_name,
          photo: r.photos[0] ?? null,
          verified: r.verified_badge,
        },
        lastMessage: r.last_message
          ? { content: r.last_message, createdAt: r.last_message_at }
          : null,
      })),
    });
  }),
);

/** DELETE /api/likes/matches/:matchId — rompt un match (le chat est fermé). */
router.delete(
  '/matches/:matchId',
  asyncHandler(async (req, res) => {
    const matchId = uuid.parse(req.params.matchId);
    const match = await findActiveMatchForUser(matchId, req.user!.sub);
    if (!match) throw new HttpError(404, 'Match introuvable');

    await pool.query('UPDATE matches SET unmatched_at = now() WHERE id = $1', [matchId]);

    const io = req.app.get('io') as Server | undefined;
    io?.to(`match:${matchId}`).emit('match:closed', { matchId });
    io?.in(`match:${matchId}`).socketsLeave(`match:${matchId}`);

    res.status(204).end();
  }),
);

/** GET /api/likes/matches/:matchId/messages?before=ISO — historique paginé. */
router.get(
  '/matches/:matchId/messages',
  asyncHandler(async (req, res) => {
    const matchId = uuid.parse(req.params.matchId);
    const before = z.string().datetime().optional().parse(req.query.before);
    const match = await findActiveMatchForUser(matchId, req.user!.sub);
    if (!match) throw new HttpError(404, 'Match introuvable');

    const { rows } = await pool.query(
      `SELECT id, sender_id, content, created_at, read_at FROM messages
        WHERE match_id = $1 AND ($2::timestamptz IS NULL OR created_at < $2)
        ORDER BY created_at DESC LIMIT 50`,
      [matchId, before ?? null],
    );

    res.json({
      messages: rows.reverse().map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
        readAt: m.read_at,
      })),
    });
  }),
);

export default router;
