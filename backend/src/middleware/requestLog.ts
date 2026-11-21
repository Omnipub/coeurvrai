import { NextFunction, Request, Response } from 'express';
import { logger, pseudonym, safePath } from '../utils/logger';

/** Une ligne par requête API : méthode, chemin masqué, statut, durée, membre pseudonymisé. */
export function requestLog(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path === '/health') return;
    logger.info('http', {
      method: req.method,
      path: safePath(req.originalUrl),
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - start) / 1_000_000n),
      user: pseudonym(req.user?.sub),
    });
  });
  next();
}
