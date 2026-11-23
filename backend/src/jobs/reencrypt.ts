import { pool } from '../utils/db';
import { blindIndex, CTX, decrypt, encrypt } from '../utils/crypto';
import type { IpLogEntry } from '../models/types';

/**
 * Re-chiffre toutes les données sensibles avec la clé ACTIVE (la première de
 * ENCRYPTION_KEYS). À lancer après l'ajout d'une nouvelle clé ; ensuite, l'ancienne
 * clé peut être retirée de ENCRYPTION_KEYS. Chiffre aussi les données encore en clair.
 * Lancement : `npm run crypto:reencrypt` (voir infra/EXPLOITATION.md).
 */
const BATCH = 500;

async function reencryptColumn(table: string, column: string, context: string): Promise<number> {
  let lastId = '00000000-0000-0000-0000-000000000000';
  let total = 0;
  for (;;) {
    const { rows } = await pool.query<{ id: string; value: string }>(
      `SELECT id, ${column} AS value FROM ${table}
        WHERE id > $1 AND ${column} IS NOT NULL ORDER BY id LIMIT ${BATCH}`,
      [lastId],
    );
    if (!rows.length) break;
    for (const row of rows) {
      await pool.query(`UPDATE ${table} SET ${column} = $2 WHERE id = $1`, [
        row.id,
        encrypt(decrypt(row.value, context), context),
      ]);
    }
    total += rows.length;
    lastId = rows[rows.length - 1].id;
  }
  return total;
}

async function reencryptIps(): Promise<number> {
  const { rows } = await pool.query<{ id: string; last_ip: string | null; ip_logs: IpLogEntry[] }>(
    `SELECT id, last_ip, ip_logs FROM users WHERE last_ip IS NOT NULL OR jsonb_array_length(ip_logs) > 0`,
  );
  for (const u of rows) {
    const plainIp = decrypt(u.last_ip, CTX.ip);
    await pool.query('UPDATE users SET last_ip = $2, last_ip_hmac = $3, ip_logs = $4 WHERE id = $1', [
      u.id,
      plainIp ? encrypt(plainIp, CTX.ip) : null,
      plainIp ? blindIndex(plainIp, CTX.ip) : null,
      JSON.stringify(u.ip_logs.map((e) => ({ ...e, ip: encrypt(decrypt(e.ip, CTX.ip), CTX.ip) }))),
    ]);
  }
  return rows.length;
}

export async function reencryptAll() {
  return {
    messages: await reencryptColumn('messages', 'content', CTX.messageContent),
    reportDetails: await reencryptColumn('reports', 'details', CTX.reportDetails),
    reportResolutions: await reencryptColumn('reports', 'resolution_note', CTX.reportResolution),
    users: await reencryptIps(),
  };
}

if (require.main === module) {
  reencryptAll()
    .then((r) => console.info('[reencrypt]', JSON.stringify(r)))
    .catch((err) => {
      console.error('[reencrypt]', (err as Error).message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
