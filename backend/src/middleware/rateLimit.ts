import { NextFunction, Request, Response } from 'express';
import { redis } from '../utils/redis';
import { HttpError } from '../utils/http';

/**
 * Rate limiting à fenêtre fixe, stocké dans Redis.
 * Clé : préfixe + IP (ou utilisateur si authentifié).
 */
export function rateLimit(prefix: string, max: number, windowSeconds: number) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const who = req.user?.sub ?? req.ip ?? 'unknown';
      const key = `ratelimit:${prefix}:${who}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      if (count > max) {
        throw new HttpError(429, 'Trop de requêtes, réessayez plus tard');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
