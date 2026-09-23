import { pool } from '../utils/db';
import { schema } from './schema';

async function migrate(): Promise<void> {
  await pool.query(schema);
  console.log('Schéma appliqué.');
}

migrate()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
