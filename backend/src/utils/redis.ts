import { createClient } from 'redis';
import { logger } from './logger';
import { config } from './config';

export const redis = createClient({ url: config.redisUrl });

redis.on('error', (err) => logger.error('redis.error', err));

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}
