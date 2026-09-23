import cron from 'node-cron';
import { config } from '../utils/config';
import { runCleanup } from './cleanup';

/** Planifie les purges RGPD (par défaut chaque nuit à 3 h, heure de Paris). */
export function startScheduler(): cron.ScheduledTask | null {
  if (!config.cleanupCron) {
    console.info('[cleanup] planification désactivée (CLEANUP_CRON vide)');
    return null;
  }
  if (!cron.validate(config.cleanupCron)) {
    throw new Error(`CLEANUP_CRON invalide : ${config.cleanupCron}`);
  }
  return cron.schedule(
    config.cleanupCron,
    () => {
      runCleanup().catch((err) => console.error('[cleanup]', err));
    },
    { timezone: 'Europe/Paris' },
  );
}
