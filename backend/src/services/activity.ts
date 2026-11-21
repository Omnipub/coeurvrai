import type { IncomingHttpHeaders } from 'http';
import { pool } from '../utils/db';
import { blindIndex, CTX, decrypt, encrypt } from '../utils/crypto';
import type { IpLogEntry } from '../models/types';

/** Durée de conservation des données de connexion (politique de confidentialité, § 8). */
export const IP_RETENTION = '1 year';

/** Intervalle minimal entre deux mises à jour de `last_activity_at` pour une même IP. */
const ACTIVITY_THROTTLE = '5 minutes';

/**
 * Expression SQL : `ip_logs` sans les entrées de plus d'un an.
 * Réutilisée par l'enregistrement des connexions et par le job de purge.
 */
export const PRUNED_IP_LOGS_SQL = `
  COALESCE((
    SELECT jsonb_agg(e ORDER BY e->>'date')
      FROM jsonb_array_elements(ip_logs) e
     WHERE (e->>'date')::timestamptz > now() - INTERVAL '${IP_RETENTION}'
  ), '[]'::jsonb)`;

/**
 * Enregistre l'activité d'un membre.
 *
 * - `last_activity_at` est mis à jour au plus toutes les 5 minutes ;
 * - une entrée `{ ip, date }` est ajoutée à `ip_logs` à chaque connexion
 *   (`isLogin`) ou changement d'adresse IP ;
 * - les entrées de plus d'un an sont purgées au passage.
 */
export async function recordActivity(
  userId: string,
  ip: string | null,
  { isLogin = false }: { isLogin?: boolean } = {},
): Promise<void> {
  // L'IP est stockée chiffrée ; son empreinte HMAC sert à détecter un changement d'IP.
  const ipHmac = ip ? blindIndex(ip, CTX.ip) : null;
  const ipEnc = ip ? encrypt(ip, CTX.ip) : null;
  await pool.query(
    `UPDATE users
        SET last_activity_at = now(),
            inactivity_warned_at = NULL,
            last_ip = COALESCE($2, last_ip),
            last_ip_hmac = COALESCE($4, last_ip_hmac),
            ip_logs = CASE
              WHEN $4::text IS NOT NULL AND ($3 OR last_ip_hmac IS DISTINCT FROM $4)
                THEN ${PRUNED_IP_LOGS_SQL}
                     || jsonb_build_array(jsonb_build_object('ip', $2::text, 'date', now()))
              ELSE ip_logs
            END
      WHERE id = $1
        AND ($3
             OR last_activity_at < now() - INTERVAL '${ACTIVITY_THROTTLE}'
             OR ($4::text IS NOT NULL AND last_ip_hmac IS DISTINCT FROM $4))`,
    [userId, ipEnc, isLogin, ipHmac],
  );
}

/** Déchiffre la dernière IP et l'historique (plus récent d'abord). */
export function readConnectionData(user: { last_ip: string | null; ip_logs: IpLogEntry[] }) {
  return {
    lastIp: decrypt(user.last_ip, CTX.ip),
    ipLogs: [...user.ip_logs]
      .map((e) => ({ ip: decrypt(e.ip, CTX.ip), date: e.date }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

/** Version « fire-and-forget » : une erreur de journalisation ne bloque jamais la requête. */
export function trackActivity(userId: string, ip: string | null, opts?: { isLogin?: boolean }) {
  recordActivity(userId, ip, opts).catch((err) => console.error('[activity]', err));
}

/**
 * IP client d'une connexion Socket.io, avec la même règle qu'Express
 * (`trust proxy = 1`) : la dernière adresse de X-Forwarded-For, ajoutée par
 * notre reverse proxy. Les adresses précédentes sont fournies par le client
 * et ne sont pas fiables.
 */
export function socketClientIp(headers: IncomingHttpHeaders, address: string): string {
  const forwarded = headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded.join(',') : forwarded;
  const last = value?.split(',').pop()?.trim();
  return last || address;
}
