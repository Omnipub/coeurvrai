/**
 * Applique les migrations en attente : `npm run db:migrate` (ou `node dist/db/migrate.js`).
 * Utilise MIGRATION_DATABASE_URL (utilisateur propriétaire du schéma), à défaut DATABASE_URL.
 */
import dotenv from 'dotenv';
import { runMigrations } from './migrations';

dotenv.config();

const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('MIGRATION_DATABASE_URL ou DATABASE_URL requis');
  process.exit(1);
}

runMigrations(url)
  .then(({ applied, skipped }) => {
    console.info(`[migrate] ${applied.length} migration(s) appliquée(s), ${skipped} déjà à jour.`);
  })
  .catch((err) => {
    console.error(`[migrate] ${(err as Error).message}`);
    process.exitCode = 1;
  });
