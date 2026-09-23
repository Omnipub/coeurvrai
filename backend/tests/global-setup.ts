import { Client } from 'pg';

/** Crée la base de test si elle n'existe pas, puis applique le schéma. */
export default async function setup(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL!);
  const dbName = url.pathname.slice(1);

  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rowCount) await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
  await admin.end();

  const { schema } = await import('../src/db/schema');
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  await client.query(schema);
  await client.end();
}
