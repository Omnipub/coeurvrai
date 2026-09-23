import { PoolClient } from 'pg';
import { pool } from '../utils/db';

type Queryable = Pick<PoolClient, 'query'>;

/** Vrai si l'un des deux utilisateurs a bloqué l'autre. */
export async function isBlocked(a: string, b: string, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1 FROM blocks
      WHERE (blocker_id = $1 AND blocked_id = $2)
         OR (blocker_id = $2 AND blocked_id = $1)`,
    [a, b],
  );
  return (rowCount ?? 0) > 0;
}

/** Retourne le match actif si `userId` en fait partie, sinon null. */
export async function findActiveMatchForUser(
  matchId: string,
  userId: string,
  db: Queryable = pool,
): Promise<{ id: string; user_a: string; user_b: string } | null> {
  const { rows } = await db.query(
    `SELECT id, user_a, user_b FROM matches
      WHERE id = $1 AND unmatched_at IS NULL AND (user_a = $2 OR user_b = $2)`,
    [matchId, userId],
  );
  return rows[0] ?? null;
}

export function otherUser(match: { user_a: string; user_b: string }, userId: string): string {
  return match.user_a === userId ? match.user_b : match.user_a;
}
