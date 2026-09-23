/** Lancement manuel des purges : `npm run jobs:cleanup`. */
import { pool } from '../utils/db';
import { runCleanup } from './cleanup';

runCleanup()
  .then((result) => {
    if (!result) console.warn('Un nettoyage est déjà en cours.');
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
