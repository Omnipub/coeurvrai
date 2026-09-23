import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../utils/db';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { OnfidoStatus, User } from '../models/types';
import { getOnfidoClient, InvalidWebhookSignature, readWebhook } from '../services/onfido';

const router = Router();

/** Statuts définitifs : un nouveau contrôle n'est possible qu'après échec ou abandon. */
const RETRYABLE: (OnfidoStatus | null)[] = [null, 'awaiting_input', 'abandoned', 'error', 'declined'];

/**
 * POST /api/verification/onfido-check — webhook Onfido (public, signé).
 * Configuré dans le dashboard Onfido pour l'événement `workflow_run.completed`.
 * Répond toujours 200 à un webhook authentique, pour éviter les renvois inutiles.
 */
router.post(
  '/onfido-check',
  asyncHandler(async (req, res) => {
    let event;
    try {
      event = readWebhook(req.rawBody, req.header('X-SHA2-Signature'));
    } catch (err) {
      if (err instanceof InvalidWebhookSignature) throw new HttpError(401, 'Signature invalide');
      throw err;
    }

    const payload = event.payload;
    if (payload?.resource_type !== 'workflow_run' || !payload.object?.id) {
      return res.json({ received: true, ignored: true });
    }

    const known = await pool.query('SELECT 1 FROM users WHERE onfido_check_id = $1', [payload.object.id]);
    if (!known.rowCount) return res.json({ received: true, ignored: true });

    // Le statut fait foi côté API Onfido ; à défaut de client, on prend celui du webhook signé.
    const onfido = getOnfidoClient();
    const run = onfido
      ? await onfido.findWorkflowRun(payload.object.id)
      : { id: payload.object.id, applicantId: null, status: payload.object.status as OnfidoStatus };

    const { rowCount } = await pool.query(
      `UPDATE users
          SET onfido_check_status = $2, onfido_checked_at = now(), updated_at = now()
        WHERE onfido_check_id = $1
          AND ($3::text IS NULL OR onfido_applicant_id = $3)`,
      [run.id, run.status, run.applicantId],
    );
    res.json({ received: true, updated: rowCount === 1 });
  }),
);

router.use(requireAuth);

/** GET /api/verification/status */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query<User>(
      `SELECT email, email_verified, email_verified_at, onfido_check_status, onfido_checked_at, verified_badge
         FROM users WHERE id = $1`,
      [req.user!.sub],
    );
    const u = rows[0];
    res.json({
      email: u.email,
      emailVerified: u.email_verified,
      emailVerifiedAt: u.email_verified_at,
      onfidoStatus: u.onfido_check_status,
      onfidoCheckedAt: u.onfido_checked_at,
      verifiedBadge: u.verified_badge,
      onfidoAvailable: getOnfidoClient() !== null,
    });
  }),
);

const tokenSchema = z.object({
  // Consentement explicite au traitement de données biométriques (RGPD art. 9.2.a).
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Votre consentement explicite est requis pour la vérification par selfie' }),
  }),
});

/**
 * POST /api/verification/onfido-token — crée l'applicant (une seule fois) et un
 * workflow run Onfido Studio ; renvoie le jeton pour le SDK web.
 */
router.post(
  '/onfido-token',
  rateLimit('onfido-token', 5, 24 * 60 * 60),
  asyncHandler(async (req, res) => {
    tokenSchema.parse(req.body);
    const onfido = getOnfidoClient();
    if (!onfido) throw new HttpError(503, 'La vérification d’identité n’est pas disponible pour le moment');

    const { rows } = await pool.query<User>(
      'SELECT onfido_applicant_id, onfido_check_status FROM users WHERE id = $1',
      [req.user!.sub],
    );
    const user = rows[0];
    if (!RETRYABLE.includes(user.onfido_check_status)) {
      throw new HttpError(409, 'Une vérification est déjà en cours ou terminée');
    }

    let applicantId = user.onfido_applicant_id;
    if (!applicantId) {
      const created = (await onfido.createApplicant()).id;
      // COALESCE : en cas de requêtes simultanées, on garde le premier applicant enregistré.
      const saved = await pool.query<{ onfido_applicant_id: string }>(
        `UPDATE users SET onfido_applicant_id = COALESCE(onfido_applicant_id, $2)
          WHERE id = $1 RETURNING onfido_applicant_id`,
        [req.user!.sub, created],
      );
      applicantId = saved.rows[0].onfido_applicant_id;
      if (applicantId !== created) await onfido.deleteApplicant(created).catch(() => undefined);
    }

    const run = await onfido.createWorkflowRun(applicantId);
    await pool.query(
      `UPDATE users
          SET onfido_check_id = $2, onfido_check_status = $3, onfido_consent_at = now(),
              onfido_checked_at = NULL, updated_at = now()
        WHERE id = $1`,
      [req.user!.sub, run.id, run.status],
    );

    res.status(201).json({ sdkToken: run.sdkToken, workflowRunId: run.id });
  }),
);

export default router;
