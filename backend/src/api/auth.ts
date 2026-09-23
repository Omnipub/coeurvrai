import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool, withTransaction } from '../utils/db';
import { config } from '../utils/config';
import { asyncHandler, HttpError } from '../utils/http';
import { signToken } from '../utils/jwt';
import { ageFromBirthdate } from '../utils/age';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { recordActivity } from '../services/activity';
import { ACCOUNT_TYPES, TERMS_VERSION, User } from '../models/types';

const router = Router();

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(128),
  accountType: z.enum(ACCOUNT_TYPES),
  birthdate: z.string().date(),
  displayName: z.string().trim().min(2).max(40),
  // Deux consentements distincts : CGU + charte, et traitement des données
  // sensibles (RGPD art. 9.2.a, consentement explicite et séparé).
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez accepter les CGU et la charte de la communauté' }),
  }),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: 'Votre consentement au traitement des données sensibles est requis' }),
  }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

function publicUser(user: Pick<User, 'id' | 'email' | 'account_type' | 'role'>) {
  return { id: user.id, email: user.email, accountType: user.account_type, role: user.role };
}

/** POST /api/auth/signup — création de compte + profil vide. */
router.post(
  '/signup',
  rateLimit('signup', 5, 60 * 60),
  asyncHandler(async (req, res) => {
    const body = signupSchema.parse(req.body);

    if (ageFromBirthdate(body.birthdate) < 18) {
      throw new HttpError(400, 'Le site est réservé aux personnes majeures');
    }

    const passwordHash = await bcrypt.hash(body.password, config.bcryptRounds);
    const profileTable = body.accountType === 'homme' ? 'profiles_homme' : 'profiles_femme_trans';

    const user = await withTransaction(async (client) => {
      const existing = await client.query('SELECT 1 FROM users WHERE email = $1', [body.email]);
      if (existing.rowCount) throw new HttpError(409, 'Adresse e-mail déjà utilisée');

      const { rows } = await client.query<User>(
        `INSERT INTO users (email, password_hash, account_type, birthdate,
                            terms_accepted_date, terms_version, gdpr_consent_date)
         VALUES ($1, $2, $3, $4, now(), $5, now())
         RETURNING id, email, account_type, role`,
        [body.email, passwordHash, body.accountType, body.birthdate, TERMS_VERSION],
      );
      await client.query(`INSERT INTO ${profileTable} (user_id, display_name) VALUES ($1, $2)`, [
        rows[0].id,
        body.displayName,
      ]);
      return rows[0];
    });

    await recordActivity(user.id, req.ip ?? null, { isLogin: true });
    const token = signToken({ sub: user.id, accountType: user.account_type, role: user.role });
    res.status(201).json({ token, user: publicUser(user) });
  }),
);

/** POST /api/auth/login */
router.post(
  '/login',
  rateLimit('login', 10, 15 * 60),
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const { rows } = await pool.query<User>('SELECT * FROM users WHERE email = $1', [body.email]);
    const user = rows[0];

    // Même message dans les deux cas pour ne pas révéler l'existence d'un compte.
    const valid = user ? await bcrypt.compare(body.password, user.password_hash) : false;
    if (!user || !valid) throw new HttpError(401, 'Identifiants invalides');
    if (user.status !== 'active') throw new HttpError(403, 'Compte suspendu');

    await recordActivity(user.id, req.ip ?? null, { isLogin: true });
    const token = signToken({ sub: user.id, accountType: user.account_type, role: user.role });
    res.json({ token, user: publicUser(user) });
  }),
);

/** GET /api/auth/me */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query<User>(
      'SELECT id, email, account_type, role FROM users WHERE id = $1',
      [req.user!.sub],
    );
    res.json({ user: publicUser(rows[0]) });
  }),
);

export default router;
