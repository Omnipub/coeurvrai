import { Router } from 'express';
import { z } from 'zod';
import type { Server } from 'socket.io';
import { pool } from '../utils/db';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { REPORT_REASONS } from '../models/types';
import { claimNextReport, createReport, queueStats, resolveReport } from '../services/moderation';

const router = Router();
router.use(requireAuth);

const reportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(2000).nullable().optional(),
  messageId: z.string().uuid().nullable().optional(),
});

/** POST /api/reports — signaler un membre (le bloque automatiquement). */
router.post(
  '/reports',
  rateLimit('report', 20, 24 * 60 * 60),
  asyncHandler(async (req, res) => {
    const body = reportSchema.parse(req.body);
    const { id } = await createReport({ reporterId: req.user!.sub, ...body });
    res.status(201).json({ id });
  }),
);

/** POST /api/blocks/:userId — bloquer un membre sans le signaler. */
router.post(
  '/blocks/:userId',
  asyncHandler(async (req, res) => {
    const blockedId = z.string().uuid().parse(req.params.userId);
    if (blockedId === req.user!.sub) throw new HttpError(400, 'Action impossible');
    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user!.sub, blockedId],
    );
    res.status(204).end();
  }),
);

// ------------------------------------------------------------ Modération
const mod = Router();
mod.use(requireRole('moderator', 'admin'));

/** GET /api/moderation/stats */
mod.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json(await queueStats());
  }),
);

/** POST /api/moderation/next — s'attribuer le prochain signalement. */
mod.post(
  '/next',
  asyncHandler(async (req, res) => {
    const report = await claimNextReport(req.user!.sub);
    if (!report) return res.status(204).end();

    const context = report.message_id
      ? await pool.query('SELECT content, created_at FROM messages WHERE id = $1', [report.message_id])
      : null;
    res.json({ report, message: context?.rows[0] ?? null });
  }),
);

const resolveSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'suspend', 'ban']),
  note: z.string().trim().max(2000).nullable().optional(),
});

/** POST /api/moderation/:id/resolve */
mod.post(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { action, note } = resolveSchema.parse(req.body);
    const report = await resolveReport(id, req.user!.sub, action, note ?? null);

    if (action === 'suspend' || action === 'ban') {
      const io = req.app.get('io') as Server | undefined;
      io?.in(`user:${report.reported_id}`).disconnectSockets(true);
    }
    res.json({ report });
  }),
);

router.use('/moderation', mod);

export default router;
