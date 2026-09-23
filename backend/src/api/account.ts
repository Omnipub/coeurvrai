import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import type { Server } from 'socket.io';
import { pool } from '../utils/db';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { IpLogEntry, TERMS_VERSION, User } from '../models/types';
import { buildExport, deleteAccount } from '../services/account';

const router = Router();

/** GET /api/account/consent-version — version en vigueur des CGU / charte / politique (public). */
router.get('/consent-version', (_req, res) => {
  res.json({ version: TERMS_VERSION });
});

router.use(requireAuth);

/** GET /api/account — informations du compte pour la page Paramètres. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query<User>('SELECT * FROM users WHERE id = $1', [req.user!.sub]);
    const user = rows[0];
    const ipLogs = [...(user.ip_logs as IpLogEntry[])].sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      email: user.email,
      accountType: user.account_type,
      createdAt: user.created_at,
      lastActivityAt: user.last_activity_at,
      lastIp: user.last_ip,
      ipLogs,
      consents: {
        termsVersion: user.terms_version,
        termsAcceptedDate: user.terms_accepted_date,
        gdprConsentDate: user.gdpr_consent_date,
        currentVersion: TERMS_VERSION,
        upToDate: user.terms_version === TERMS_VERSION && user.gdpr_consent_date !== null,
      },
    });
  }),
);

const consentSchema = z.object({
  acceptTerms: z.literal(true),
  gdprConsent: z.literal(true),
});

/** POST /api/account/consent — accepter la version en vigueur des textes. */
router.post(
  '/consent',
  asyncHandler(async (req, res) => {
    consentSchema.parse(req.body);
    await pool.query(
      `UPDATE users
          SET terms_accepted_date = now(), terms_version = $2, gdpr_consent_date = now(), updated_at = now()
        WHERE id = $1`,
      [req.user!.sub, TERMS_VERSION],
    );
    res.json({ version: TERMS_VERSION });
  }),
);

/** GET /api/account/export — télécharge toutes ses données au format JSON. */
router.get(
  '/export',
  rateLimit('export', 5, 60 * 60),
  asyncHandler(async (req, res) => {
    const data = await buildExport(req.user!.sub);
    const day = data.exportedAt.slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="coeurvrai-export-${day}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/json').send(JSON.stringify(data, null, 2));
  }),
);

const deleteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

/**
 * DELETE /api/account/delete — suppression définitive du compte.
 * Exige de ressaisir l'e-mail et le mot de passe du compte.
 */
router.delete(
  '/delete',
  rateLimit('delete-account', 5, 15 * 60),
  asyncHandler(async (req, res) => {
    const { email, password } = deleteSchema.parse(req.body);
    const { rows } = await pool.query<User>('SELECT email, password_hash FROM users WHERE id = $1', [
      req.user!.sub,
    ]);
    const user = rows[0];

    if (user.email.toLowerCase() !== email) {
      throw new HttpError(400, 'L’adresse e-mail ne correspond pas à votre compte');
    }
    if (!(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, 'Mot de passe incorrect');
    }

    await deleteAccount(req.user!.sub, req.app.get('io') as Server | undefined);
    res.status(204).end();
  }),
);

export default router;
