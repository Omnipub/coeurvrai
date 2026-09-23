import { pool, withTransaction } from '../utils/db';
import { redis } from '../utils/redis';
import { HttpError } from '../utils/http';
import { Report, ReportReason } from '../models/types';

/**
 * File de modération.
 *
 * PostgreSQL est la source de vérité (table `reports`) ; Redis ne sert qu'à
 * ordonner le travail des modérateurs via deux listes FIFO :
 *   - moderation:queue:priority  (mineur présumé, ou signalements multiples)
 *   - moderation:queue:normal
 * Si Redis a perdu ses données, on retombe sur les signalements `pending` en base.
 */
const QUEUE_PRIORITY = 'moderation:queue:priority';
const QUEUE_NORMAL = 'moderation:queue:normal';

/** Nombre de signaleurs distincts sur 24 h à partir duquel un cas devient prioritaire. */
const ESCALATION_THRESHOLD = 3;
const PRIORITY_REASONS: ReportReason[] = ['mineur'];

export type ModerationAction = 'dismiss' | 'warn' | 'suspend' | 'ban';

export interface CreateReportInput {
  reporterId: string;
  reportedId: string;
  reason: ReportReason;
  details?: string | null;
  messageId?: string | null;
}

/**
 * Enregistre un signalement, bloque automatiquement la personne signalée
 * (protection immédiate du signaleur) et place le cas dans la file.
 */
export async function createReport(input: CreateReportInput): Promise<{ id: string; priority: boolean }> {
  const { reporterId, reportedId, reason, details = null, messageId = null } = input;
  if (reporterId === reportedId) throw new HttpError(400, 'Action impossible');

  const reportId = await withTransaction(async (client) => {
    const target = await client.query('SELECT 1 FROM users WHERE id = $1', [reportedId]);
    if (!target.rowCount) throw new HttpError(404, 'Membre introuvable');

    if (messageId) {
      // Le message doit venir de la personne signalée, dans un match du signaleur.
      const msg = await client.query(
        `SELECT 1 FROM messages msg JOIN matches m ON m.id = msg.match_id
          WHERE msg.id = $1 AND msg.sender_id = $2 AND (m.user_a = $3 OR m.user_b = $3)`,
        [messageId, reportedId, reporterId],
      );
      if (!msg.rowCount) throw new HttpError(400, 'Message invalide');
    }

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO reports (reporter_id, reported_id, message_id, reason, details)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [reporterId, reportedId, messageId, reason, details],
    );
    await client.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [reporterId, reportedId],
    );
    return rows[0].id;
  });

  const priority = PRIORITY_REASONS.includes(reason) || (await distinctReporters24h(reportedId)) >= ESCALATION_THRESHOLD;
  await redis.lPush(priority ? QUEUE_PRIORITY : QUEUE_NORMAL, reportId);

  return { id: reportId, priority };
}

async function distinctReporters24h(reportedId: string): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT COUNT(DISTINCT reporter_id)::int AS n FROM reports
      WHERE reported_id = $1 AND created_at > now() - INTERVAL '24 hours'`,
    [reportedId],
  );
  return rows[0].n;
}

/** Tente d'attribuer un signalement `pending` au modérateur. */
async function claim(reportId: string, moderatorId: string): Promise<Report | null> {
  const { rows } = await pool.query<Report>(
    `UPDATE reports SET status = 'reviewing', moderator_id = $2
      WHERE id = $1 AND status = 'pending'
      RETURNING *`,
    [reportId, moderatorId],
  );
  return rows[0] ?? null;
}

/**
 * Prend le prochain signalement à traiter : file prioritaire, puis normale,
 * puis repli sur la base. Les entrées obsolètes de la file sont ignorées.
 */
export async function claimNextReport(moderatorId: string): Promise<Report | null> {
  for (const queue of [QUEUE_PRIORITY, QUEUE_NORMAL]) {
    let id: string | null;
    while ((id = await redis.rPop(queue))) {
      const report = await claim(id, moderatorId);
      if (report) return report;
    }
  }

  const { rows } = await pool.query<Report>(
    `UPDATE reports SET status = 'reviewing', moderator_id = $1
      WHERE id = (
        SELECT id FROM reports WHERE status = 'pending'
         ORDER BY (reason = 'mineur') DESC, created_at
         LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING *`,
    [moderatorId],
  );
  return rows[0] ?? null;
}

/**
 * Clôt un signalement. `suspend` et `ban` modifient le statut du compte
 * signalé ; la personne est alors déconnectée par l'appelant.
 */
export async function resolveReport(
  reportId: string,
  moderatorId: string,
  action: ModerationAction,
  note: string | null,
): Promise<Report> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<Report>(
      `UPDATE reports
          SET status = $3, moderator_id = $2, resolution_note = $4, closed_at = now()
        WHERE id = $1 AND status IN ('pending', 'reviewing')
        RETURNING *`,
      [reportId, moderatorId, action === 'dismiss' ? 'dismissed' : 'resolved', note],
    );
    const report = rows[0];
    if (!report) throw new HttpError(404, 'Signalement introuvable ou déjà traité');

    if (action === 'suspend' || action === 'ban') {
      await client.query(`UPDATE users SET status = $2, updated_at = now() WHERE id = $1`, [
        report.reported_id,
        action === 'ban' ? 'banned' : 'suspended',
      ]);
    }
    return report;
  });
}

export async function queueStats() {
  const [priority, normal, pending] = await Promise.all([
    redis.lLen(QUEUE_PRIORITY),
    redis.lLen(QUEUE_NORMAL),
    pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM reports WHERE status = 'pending'`),
  ]);
  return { priority, normal, pending: pending.rows[0].n };
}
