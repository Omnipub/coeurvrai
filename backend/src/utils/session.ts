import type { IncomingHttpHeaders } from 'http';
import type { Request, Response } from 'express';
import { parse } from 'cookie';
import { config } from './config';
import { signToken, TokenPayload } from './jwt';

/**
 * Session portée par un cookie, jamais lisible par JavaScript :
 *  - HttpOnly : inaccessible aux scripts (une faille XSS ne peut pas voler la session) ;
 *  - Secure + préfixe __Host- en production : HTTPS uniquement, lié au domaine exact ;
 *  - SameSite=Strict : jamais envoyé par un autre site (protection CSRF de base,
 *    complétée par la vérification d'origine de middleware/csrf.ts).
 */
export const SESSION_COOKIE = config.cookieSecure ? '__Host-cv_session' : 'cv_session';

const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function setSessionCookie(res: Response, payload: TokenPayload): void {
  res.cookie(SESSION_COOKIE, signToken(payload), {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.cookieSecure, sameSite: 'strict', path: '/' });
}

export function sessionTokenFromHeaders(headers: IncomingHttpHeaders): string | null {
  const raw = headers.cookie;
  if (!raw) return null;
  return parse(raw)[SESSION_COOKIE] ?? null;
}

export function sessionToken(req: Request): string | null {
  return sessionTokenFromHeaders(req.headers);
}
