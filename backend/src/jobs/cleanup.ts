import { pool } from '../utils/db';
import { IP_RETENTION, PRUNED_IP_LOGS_SQL } from '../services/activity';

/**
 * Purges RGPD automatiques (voir la politique de confidentialité, § 8) :
 *   - comptes inactifs depuis 2 ans, après un préavis de 30 jours ;
 *   - signalements clos depuis plus d'1 an ;
 *   - données de connexion (IP) de plus d'1 an.
 *
 * Toutes les dates sont calculées par PostgreSQL (`now()`), ce qui permet de
 * tester les jobs en antidatant les lignes.
 */

export const INACTIVITY_LIMIT = '2 years';
export const INACTIVITY_NOTICE = '30 days';
export const CLOSED_REPORT_RETENTION = '1 year';

/** Clé du verrou consultatif : un seul nettoyage à la fois, même avec plusieurs instances. */
const CLEANUP_LOCK_KEY = 72_021_609;

export interface CleanupResult {
  inactivityWarned: number;
  inactiveAccountsDeleted: number;
  closedReportsDeleted: number;
  ipLogsPruned: number;
}

/**
 * Envoie le préavis de suppression pour inactivité.
 * TODO : brancher le prestataire d'e-mails transactionnels.
 */
async function sendInactivityNotice(email: string): Promise<void> {
  console.info(`[cleanup] préavis d'inactivité à envoyer à ${email}`);
}

/**
 * Étape 1 : préavis aux comptes inactifs depuis (2 ans − 30 jours).
 * Étape 2 : suppression des comptes inactifs depuis 2 ans et prévenus depuis 30 jours.
 * Toute nouvelle activité remet `inactivity_warned_at` à NULL (services/activity.ts).
 */
export async function purgeInactiveAccounts(): Promise<{ warned: number; deleted: number }> {
  const warned = await pool.query<{ email: string }>(
    `UPDATE users SET inactivity_warned_at = now()
      WHERE inactivity_warned_at IS NULL
        AND last_activity_at < now() - INTERVAL '${INACTIVITY_LIMIT}' + INTERVAL '${INACTIVITY_NOTICE}'
      RETURNING email`,
  );
  for (const { email } of warned.rows) await sendInactivityNotice(email);

  // Suppression en cascade : profil, photos, likes, matchs, messages, blocages, signalements.
  const deleted = await pool.query(
    `DELETE FROM users
      WHERE last_activity_at < now() - INTERVAL '${INACTIVITY_LIMIT}'
        AND inactivity_warned_at < now() - INTERVAL '${INACTIVITY_NOTICE}'`,
  );

  return { warned: warned.rowCount ?? 0, deleted: deleted.rowCount ?? 0 };
}

/** Supprime les signalements clos (traités ou classés) depuis plus d'un an. */
export async function purgeClosedReports(): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM reports
      WHERE status IN ('resolved', 'dismissed')
        AND closed_at < now() - INTERVAL '${CLOSED_REPORT_RETENTION}'`,
  );
  return rowCount ?? 0;
}

/** Retire des `ip_logs` les entrées de plus d'un an, et `last_ip` s'il est aussi ancien. */
export async function purgeOldIpLogs(): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE users
        SET ip_logs = ${PRUNED_IP_LOGS_SQL},
            last_ip = CASE WHEN last_activity_at < now() - INTERVAL '${IP_RETENTION}'
                           THEN NULL ELSE last_ip END
      WHERE EXISTS (
              SELECT 1 FROM jsonb_array_elements(ip_logs) e
               WHERE (e->>'date')::timestamptz <= now() - INTERVAL '${IP_RETENTION}')
         OR (last_ip IS NOT NULL AND last_activity_at < now() - INTERVAL '${IP_RETENTION}')`,
  );
  return rowCount ?? 0;
}

/**
 * Exécute toutes les purges sous verrou consultatif PostgreSQL.
 * Retourne null si un autre processus effectue déjà le nettoyage.
 */
export async function runCleanup(): Promise<CleanupResult | null> {
  const lock = await pool.connect();
  try {
    const { rows } = await lock.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [
      CLEANUP_LOCK_KEY,
    ]);
    if (!rows[0].locked) return null;

    try {
      const inactive = await purgeInactiveAccounts();
      const result: CleanupResult = {
        inactivityWarned: inactive.warned,
        inactiveAccountsDeleted: inactive.deleted,
        closedReportsDeleted: await purgeClosedReports(),
        ipLogsPruned: await purgeOldIpLogs(),
      };
      console.info('[cleanup]', JSON.stringify(result));
      return result;
    } finally {
      await lock.query('SELECT pg_advisory_unlock($1)', [CLEANUP_LOCK_KEY]);
    }
  } finally {
    lock.release();
  }
}
