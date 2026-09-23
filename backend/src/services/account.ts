import type { Server } from 'socket.io';
import { pool, withTransaction } from '../utils/db';
import { AccountType, TERMS_VERSION, User } from '../models/types';
import { PROFILE_TABLE } from './profiles';

/**
 * Supprime définitivement un compte et toutes ses données.
 *
 * Les clés étrangères `ON DELETE CASCADE` effacent en une transaction :
 * profil (et donc photos), likes donnés et reçus, matchs, messages de ces
 * matchs (envoyés et reçus), blocages et signalements émis ou reçus.
 * Les membres avec qui la personne avait matché sont notifiés (`match:closed`).
 *
 * TODO Stripe : résilier l'abonnement actif avant suppression.
 */
export async function deleteAccount(userId: string, io?: Server): Promise<void> {
  const matchIds = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM matches WHERE (user_a = $1 OR user_b = $1) AND unmatched_at IS NULL`,
      [userId],
    );
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    return rows.map((r) => r.id);
  });

  if (io) {
    for (const matchId of matchIds) {
      io.to(`match:${matchId}`).emit('match:closed', { matchId });
    }
    io.in(`user:${userId}`).disconnectSockets(true);
  }
}

export interface AccountExport {
  format: 'coeurvrai-export/v1';
  exportedAt: string;
  account: Record<string, unknown>;
  consents: Record<string, unknown>;
  connectionData: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  likesGiven: unknown[];
  likesReceived: unknown[];
  matches: unknown[];
  messagesSent: unknown[];
  blocks: unknown[];
  reportsFiled: unknown[];
  reportsReceived: unknown[];
  notes: string[];
}

/**
 * Export RGPD (droits d'accès, art. 15, et à la portabilité, art. 20)
 * de toutes les données concernant le membre, au format JSON.
 */
export async function buildExport(userId: string): Promise<AccountExport> {
  const { rows: users } = await pool.query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  const user = users[0];
  const accountType = user.account_type as AccountType;

  const q = (sql: string) => pool.query(sql, [userId]).then((r) => r.rows);

  const [profile, likesGiven, likesReceived, matches, messagesSent, blocks, reportsFiled, reportsReceived] =
    await Promise.all([
      q(`SELECT * FROM ${PROFILE_TABLE[accountType]} WHERE user_id = $1`),
      q(`SELECT liked_id AS "userId", created_at AS "createdAt" FROM likes
          WHERE liker_id = $1 ORDER BY created_at`),
      q(`SELECT created_at AS "createdAt" FROM likes WHERE liked_id = $1 ORDER BY created_at`),
      q(`SELECT id AS "matchId",
                CASE WHEN user_a = $1 THEN user_b ELSE user_a END AS "partnerId",
                created_at AS "createdAt", unmatched_at AS "unmatchedAt"
           FROM matches WHERE user_a = $1 OR user_b = $1 ORDER BY created_at`),
      q(`SELECT id, match_id AS "matchId", content, created_at AS "createdAt", read_at AS "readAt"
           FROM messages WHERE sender_id = $1 ORDER BY created_at`),
      q(`SELECT blocked_id AS "userId", created_at AS "createdAt" FROM blocks
          WHERE blocker_id = $1 ORDER BY created_at`),
      q(`SELECT id, reported_id AS "reportedId", reason, details, status,
                created_at AS "createdAt", closed_at AS "closedAt"
           FROM reports WHERE reporter_id = $1 ORDER BY created_at`),
      q(`SELECT reason, status, created_at AS "createdAt", closed_at AS "closedAt"
           FROM reports WHERE reported_id = $1 ORDER BY created_at`),
    ]);

  return {
    format: 'coeurvrai-export/v1',
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      accountType: user.account_type,
      birthdate: user.birthdate,
      role: user.role,
      status: user.status,
      stripeCustomerId: user.stripe_customer_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    consents: {
      termsVersion: user.terms_version,
      termsAcceptedDate: user.terms_accepted_date,
      gdprConsentDate: user.gdpr_consent_date,
      currentTermsVersion: TERMS_VERSION,
    },
    connectionData: {
      lastActivityAt: user.last_activity_at,
      lastIp: user.last_ip,
      ipLogs: user.ip_logs,
    },
    profile: profile[0] ?? null,
    likesGiven,
    likesReceived,
    matches,
    messagesSent,
    blocks,
    reportsFiled,
    reportsReceived,
    notes: [
      'Le mot de passe n’est pas exporté : il n’est stocké que sous forme de hachage irréversible.',
      'Les messages reçus et l’identité des membres qui vous ont liké·e ou signalé·e ne sont pas inclus : ce sont des données personnelles d’autres membres (RGPD art. 15.4 et 20.4).',
    ],
  };
}
