import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { runCleanup } from './cleanup';

/** Planifie les purges RGPD (par défaut chaque nuit à 3 h, heure de Paris). */
export function startScheduler(): ScheduledTask | null {
  if (!config.cleanupCron) {
    logger.info('cleanup.scheduler_disabled');
    return null;
  }
  if (!cron.validate(config.cleanupCron)) {
    throw new Error(`CLEANUP_CRON invalide : ${config.cleanupCron}`);
  }
  return cron.schedule(
    config.cleanupCron,
    () => {
      runCleanup().catch((err) => logger.error('cleanup.failed', err));
    },
    { timezone: 'Europe/Paris' },
  );
}
