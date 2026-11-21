import { NextFunction, Request, Response } from 'express';
import { config } from '../utils/config';
import { HttpError } from '../utils/http';
import { sessionToken } from '../utils/session';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Origines autorisées (le site lui-même). */
export function isAllowedOrigin(origin: string | undefined): boolean {
  return Boolean(origin) && config.allowedOrigins.includes(origin!);
}

function requestOrigin(req: Request): string | undefined {
  if (req.headers.origin) return req.headers.origin;
  const referer = req.headers.referer;
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

/**
 * Protection CSRF : toute requête qui modifie des données ET porte le cookie de
 * session doit venir du site lui-même (en-tête Origin, à défaut Referer).
 * Les appels serveur-à-serveur sans cookie (webhook Onfido, signé) ne sont pas concernés.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || !sessionToken(req)) return next();
  if (!isAllowedOrigin(requestOrigin(req))) {
    return next(new HttpError(403, 'Origine de la requête non autorisée'));
  }
  next();
}
