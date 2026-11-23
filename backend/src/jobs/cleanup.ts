import { pool } from '../utils/db';
import { logger } from '../utils/logger';
import { sendMail } from '../services/mailer';
import { config } from '../utils/config';
import { IP_RETENTION, PRUNED_IP_LOGS_SQL } from '../services/activity';
import { deleteOnfidoApplicants } from '../services/onfido';
import { deleteUserFiles, userPrefix } from '../services/photos';
import { getStorage } from '../services/storage';

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
  orphanPhotoFoldersDeleted: number;
}

/** Envoie le préavis de suppression pour inactivité (SMTP Brevo en production). */
async function sendInactivityNotice(email: string): Promise<void> {
  await sendMail({
    to: email,
    subject: 'Votre compte Cœur Vrai sera supprimé dans 30 jours',
    text: [
      'Bonjour,',
      '',
      'Vous ne vous êtes pas connecté·e à Cœur Vrai depuis près de deux ans.',
      'Conformément à notre politique de confidentialité, votre compte et toutes vos données seront supprimés dans 30 jours.',
      '',
      `Pour conserver votre compte, il suffit de vous reconnecter : ${config.appUrl}/login`,
      '',
      'L’équipe Cœur Vrai',
    ].join('\n'),
    html: `<p>Bonjour,</p>
<p>Vous ne vous êtes pas connecté·e à Cœur Vrai depuis près de deux ans. Conformément à notre politique de confidentialité, votre compte et toutes vos données seront supprimés dans <strong>30&nbsp;jours</strong>.</p>
<p>Pour conserver votre compte, il suffit de <a href="${config.appUrl}/login">vous reconnecter</a>.</p>
<p>L’équipe Cœur Vrai</p>`,
  });
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
  for (const { email } of warned.rows) {
    await sendInactivityNotice(email).catch((err) => logger.error('cleanup.notice_failed', err));
  }

  // Suppression en cascade : profil, photos, likes, matchs, messages, blocages, signalements.
  const deleted = await pool.query<{ id: string; onfido_applicant_id: string | null }>(
    `DELETE FROM users
      WHERE last_activity_at < now() - INTERVAL '${INACTIVITY_LIMIT}'
        AND inactivity_warned_at < now() - INTERVAL '${INACTIVITY_NOTICE}'
      RETURNING id, onfido_applicant_id`,
  );
  await deleteUserFiles(deleted.rows.map((r) => r.id));
  await deleteOnfidoApplicants(deleted.rows.map((r) => r.onfido_applicant_id));

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
 * Supprime du bucket les dossiers de photos dont le membre n'existe plus
 * (filet de sécurité si une suppression de fichiers a échoué).
 */
export async function purgeOrphanPhotos(): Promise<number> {
  const storage = getStorage();
  const folders = (await storage.listFolders('photos/')).filter((f) =>
    /^[0-9a-f-]{36}$/i.test(f),
  );
  if (!folders.length) return 0;
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM users WHERE id = ANY($1::uuid[])', [folders]);
  const alive = new Set(rows.map((r) => r.id));
  let removed = 0;
  for (const folder of folders) {
    if (!alive.has(folder)) {
      await storage.deletePrefix(userPrefix(folder));
      removed++;
    }
  }
  return removed;
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
        orphanPhotoFoldersDeleted: await purgeOrphanPhotos(),
      };
      logger.info('cleanup.done', { ...result });
      return result;
    } finally {
      await lock.query('SELECT pg_advisory_unlock($1)', [CLEANUP_LOCK_KEY]);
    }
  } finally {
    lock.release();
  }
}
