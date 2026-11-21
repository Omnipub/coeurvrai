import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

/**
 * Migrations versionnées : chaque fichier `migrations/NNNN_nom.sql` est appliqué
 * une seule fois, dans l'ordre, dans une transaction, et noté dans `schema_migrations`.
 *
 * Elles s'exécutent avec un utilisateur PostgreSQL dédié (propriétaire du schéma,
 * MIGRATION_DATABASE_URL), jamais avec l'utilisateur de l'application, qui n'a que
 * les droits de lecture/écriture sur les données (DB_APP_ROLE).
 */
export const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/** Verrou consultatif : deux déploiements simultanés n'appliquent pas deux fois la même migration. */
const MIGRATION_LOCK_KEY = 72_021_610;

export interface MigrationResult {
  applied: string[];
  skipped: number;
}

export function listMigrationFiles(dir = MIGRATIONS_DIR): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}_[a-z0-9_-]+\.sql$/.test(f))
    .sort();
}

export async function runMigrations(
  connectionString: string,
  { appRole = process.env.DB_APP_ROLE, log = console.info }: { appRole?: string; log?: (msg: string) => void } = {},
): Promise<MigrationResult> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
    const done = new Set(rows.map((r) => r.version));
    const result: MigrationResult = { applied: [], skipped: 0 };

    for (const file of listMigrationFiles()) {
      const version = file.replace(/\.sql$/, '');
      if (done.has(version)) {
        result.skipped++;
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Échec de la migration ${file} : ${(err as Error).message}`);
      }
      result.applied.push(version);
      log(`[migrate] ${version} appliquée`);
    }

    if (appRole) await grantAppRole(client, appRole);
    return result;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => undefined);
    await client.end();
  }
}

/**
 * Droits de l'utilisateur applicatif : lecture/écriture des données uniquement
 * (pas de création/suppression de tables, pas de superuser). Rejoué à chaque
 * déploiement pour couvrir les tables créées par les nouvelles migrations.
 */
async function grantAppRole(client: Client, role: string): Promise<void> {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(role)) throw new Error(`DB_APP_ROLE invalide : ${role}`);
  const exists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  if (!exists.rowCount) throw new Error(`Le rôle PostgreSQL « ${role} » n'existe pas`);
  await client.query(`
    GRANT USAGE ON SCHEMA public TO ${role};
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role};
    REVOKE INSERT, UPDATE, DELETE ON schema_migrations FROM ${role};
  `);
}
