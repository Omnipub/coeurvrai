import { createClient } from 'redis';
import { config } from './config';

export const redis = createClient({ url: config.redisUrl });

redis.on('error', (err) => console.error('[redis]', err));

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}
