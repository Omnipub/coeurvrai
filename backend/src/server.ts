import { createApp } from './app';
import { config } from './utils/config';
import { pool } from './utils/db';
import { connectRedis, redis } from './utils/redis';
import { startScheduler } from './jobs/scheduler';

const { server, io } = createApp();

async function start(): Promise<void> {
  await connectRedis();
  const scheduler = startScheduler();
  server.on('close', () => scheduler?.stop());
  server.listen(config.port, () => {
    console.log(`API coeur-vrai démarrée sur http://localhost:${config.port}`);
  });
}

async function shutdown(): Promise<void> {
  io.close();
  server.close();
  await Promise.allSettled([pool.end(), redis.quit()]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  console.error('Échec du démarrage :', err);
  process.exit(1);
});
