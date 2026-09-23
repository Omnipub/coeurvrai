import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { pool } from '../utils/db';
import { redis } from '../utils/redis';
import { TokenPayload, verifyToken } from '../utils/jwt';
import { findActiveMatchForUser, isBlocked, otherUser } from '../db/queries';

/**
 * Chat temps réel.
 *
 * Connexion : `io(URL, { auth: { token } })`.
 * Chaque socket rejoint `user:<id>` (notifications) puis `match:<id>` via `chat:join`.
 *
 * Client → serveur :
 *   chat:join    { matchId }                 (ack: { ok } | { error })
 *   chat:message { matchId, content }        (ack: { ok, message } | { error })
 *   chat:typing  { matchId }
 *   chat:read    { matchId }
 * Serveur → client :
 *   chat:message, chat:typing, chat:read, match:new, match:closed
 */

interface SocketData {
  user: TokenPayload;
}

type Ack = (response: Record<string, unknown>) => void;

const joinSchema = z.object({ matchId: z.string().uuid() });
const messageSchema = z.object({
  matchId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
});

/** 30 messages / 10 s par utilisateur. */
async function allowMessage(userId: string): Promise<boolean> {
  const key = `ratelimit:chat:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 10);
  return count <= 30;
}

export function registerChat(io: Server): void {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string') return next(new Error('unauthorized'));
      const user = verifyToken(token);

      const { rows } = await pool.query('SELECT status FROM users WHERE id = $1', [user.sub]);
      if (rows[0]?.status !== 'active') return next(new Error('unauthorized'));

      (socket.data as SocketData).user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { user } = socket.data as SocketData;
    socket.join(`user:${user.sub}`);

    const safe =
      <T>(handler: (payload: T, ack: Ack) => Promise<void>) =>
      async (payload: T, ack?: Ack) => {
        const reply: Ack = typeof ack === 'function' ? ack : () => undefined;
        try {
          await handler(payload, reply);
        } catch (err) {
          if (!(err instanceof z.ZodError)) console.error('[socket]', err);
          reply({ error: 'Requête invalide' });
        }
      };

    /** Vérifie que l'utilisateur est membre du match actif et non bloqué. */
    async function authorize(matchId: string) {
      const match = await findActiveMatchForUser(matchId, user.sub);
      if (!match) return null;
      if (await isBlocked(user.sub, otherUser(match, user.sub))) return null;
      return match;
    }

    socket.on(
      'chat:join',
      safe(async (payload, ack) => {
        const { matchId } = joinSchema.parse(payload);
        if (!(await authorize(matchId))) return ack({ error: 'Conversation indisponible' });
        await socket.join(`match:${matchId}`);
        ack({ ok: true });
      }),
    );

    socket.on(
      'chat:message',
      safe(async (payload, ack) => {
        const { matchId, content } = messageSchema.parse(payload);
        if (!(await authorize(matchId))) return ack({ error: 'Conversation indisponible' });
        if (!(await allowMessage(user.sub))) return ack({ error: 'Trop de messages, patientez' });

        const { rows } = await pool.query(
          `INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3)
           RETURNING id, match_id, sender_id, content, created_at`,
          [matchId, user.sub, content],
        );
        const message = {
          id: rows[0].id,
          matchId: rows[0].match_id,
          senderId: rows[0].sender_id,
          content: rows[0].content,
          createdAt: rows[0].created_at,
        };

        socket.to(`match:${matchId}`).emit('chat:message', message);
        ack({ ok: true, message });
      }),
    );

    socket.on(
      'chat:typing',
      safe(async (payload) => {
        const { matchId } = joinSchema.parse(payload);
        if (socket.rooms.has(`match:${matchId}`)) {
          socket.to(`match:${matchId}`).emit('chat:typing', { matchId, userId: user.sub });
        }
      }),
    );

    socket.on(
      'chat:read',
      safe(async (payload, ack) => {
        const { matchId } = joinSchema.parse(payload);
        if (!(await authorize(matchId))) return ack({ error: 'Conversation indisponible' });
        await pool.query(
          `UPDATE messages SET read_at = now()
            WHERE match_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
          [matchId, user.sub],
        );
        socket.to(`match:${matchId}`).emit('chat:read', { matchId, userId: user.sub });
        ack({ ok: true });
      }),
    );
  });
}
