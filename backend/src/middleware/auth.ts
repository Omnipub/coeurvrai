import { NextFunction, Request, Response } from 'express';
import { pool } from '../utils/db';
import { HttpError } from '../utils/http';
import { TokenPayload, verifyToken } from '../utils/jwt';
import { UserRole } from '../models/types';
import { trackActivity } from '../services/activity';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
      /** Corps brut de la requête (vérification des signatures de webhooks). */
      rawBody?: Buffer;
    }
  }
}

/** Exige un JWT valide et un compte actif (non suspendu ni banni). */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentification requise');
    }

    let payload: TokenPayload;
    try {
      payload = verifyToken(header.slice('Bearer '.length));
    } catch {
      throw new HttpError(401, 'Jeton invalide ou expiré');
    }

    const { rows } = await pool.query<{ status: string; role: UserRole }>(
      'SELECT status, role FROM users WHERE id = $1',
      [payload.sub],
    );
    if (!rows[0]) throw new HttpError(401, 'Compte introuvable');
    if (rows[0].status !== 'active') throw new HttpError(403, 'Compte suspendu');

    // Le rôle fait foi en base, pas dans le jeton (révocation immédiate).
    req.user = { ...payload, role: rows[0].role };
    trackActivity(payload.sub, req.ip ?? null);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Accès refusé'));
    }
    next();
  };
}
