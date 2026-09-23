import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../utils/db';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth } from '../middleware/auth';
import { isBlocked } from '../db/queries';
import { AccountType, compatibleAccountType } from '../models/types';
import {
  hasActiveMatch,
  PROFILE_TABLE,
  profileSelect,
  toPublicProfile,
} from '../services/profiles';

const router = Router();
router.use(requireAuth);

const photoUrl = z.string().url().max(500);

const baseUpdate = {
  displayName: z.string().trim().min(2).max(40).optional(),
  bio: z.string().max(1000).optional(),
  city: z.string().trim().max(80).nullable().optional(),
  photos: z.array(photoUrl).max(6).optional(),
};

const updateSchemas = {
  homme: z
    .object({ ...baseUpdate, heightCm: z.number().int().min(120).max(230).nullable().optional() })
    .strict(),
  femme_trans: z
    .object({
      ...baseUpdate,
      pronouns: z.string().trim().max(30).nullable().optional(),
      photosMatchesOnly: z.boolean().optional(),
    })
    .strict(),
};

const COLUMN: Record<string, string> = {
  displayName: 'display_name',
  bio: 'bio',
  city: 'city',
  photos: 'photos',
  heightCm: 'height_cm',
  pronouns: 'pronouns',
  photosMatchesOnly: 'photos_matches_only',
};

async function loadProfile(userId: string, type: AccountType) {
  const { rows } = await pool.query(`${profileSelect(type)} WHERE u.id = $1`, [userId]);
  return rows[0] ?? null;
}

/** GET /api/profiles/me — son propre profil (photos toujours visibles). */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const row = await loadProfile(req.user!.sub, req.user!.accountType);
    if (!row) throw new HttpError(404, 'Profil introuvable');
    res.json({ profile: toPublicProfile(row, { revealPhotos: true }) });
  }),
);

/** PUT /api/profiles/me — mise à jour partielle du profil. */
router.put(
  '/me',
  asyncHandler(async (req, res) => {
    const { sub, accountType } = req.user!;
    const body = updateSchemas[accountType].parse(req.body) as Record<string, unknown>;

    const entries = Object.entries(body).filter(([, v]) => v !== undefined);
    if (entries.length === 0) throw new HttpError(400, 'Aucun champ à mettre à jour');

    // Les noms de colonnes viennent de COLUMN (liste blanche), jamais de l'entrée utilisateur.
    const sets = entries.map(([key], i) => `${COLUMN[key]} = $${i + 2}`);
    await pool.query(
      `UPDATE ${PROFILE_TABLE[accountType]}
          SET ${sets.join(', ')}, updated_at = now()
        WHERE user_id = $1`,
      [sub, ...entries.map(([, v]) => v)],
    );

    const row = await loadProfile(sub, accountType);
    res.json({ profile: toPublicProfile(row, { revealPhotos: true }) });
  }),
);

/**
 * GET /api/profiles/discover — profils compatibles pas encore likés,
 * hors comptes bloqués (dans les deux sens) et comptes inactifs.
 */
router.get(
  '/discover',
  asyncHandler(async (req, res) => {
    const { sub, accountType } = req.user!;
    const target = compatibleAccountType(accountType);
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const { rows } = await pool.query(
      `${profileSelect(target)}
        WHERE u.status = 'active'
          AND u.id <> $1
          AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.liker_id = $1 AND l.liked_id = u.id)
          AND NOT EXISTS (
            SELECT 1 FROM blocks b
             WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
                OR (b.blocker_id = u.id AND b.blocked_id = $1))
        ORDER BY p.updated_at DESC
        LIMIT $2`,
      [sub, limit],
    );

    res.json({ profiles: rows.map((r) => toPublicProfile(r, { revealPhotos: false })) });
  }),
);

/** GET /api/profiles/:id — profil d'un autre membre compatible. */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { sub, accountType } = req.user!;
    const id = z.string().uuid().parse(req.params.id);
    const target = compatibleAccountType(accountType);

    if (await isBlocked(sub, id)) throw new HttpError(404, 'Profil introuvable');

    const { rows } = await pool.query(`${profileSelect(target)} WHERE u.id = $1 AND u.status = 'active'`, [
      id,
    ]);
    if (!rows[0]) throw new HttpError(404, 'Profil introuvable');

    const revealPhotos = await hasActiveMatch(sub, id);
    res.json({ profile: toPublicProfile(rows[0], { revealPhotos }) });
  }),
);

export default router;
