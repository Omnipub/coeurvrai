import { Pool, PoolClient } from 'pg';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

/** Exécute `fn` dans une transaction, avec rollback automatique en cas d'erreur. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
