import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { config } from '../utils/config';
import { getStorage, MemoryStorage } from '../services/storage';
import { addPhoto, deletePhoto, listOwnPhotos, MAX_UPLOAD_BYTES, reorderPhotos } from '../services/photos';

const router = Router();

/**
 * GET /api/photos/fichier/<clé>?e=…&s=… — uniquement avec le stockage en mémoire
 * (tests, site de test en ligne). URL signée et limitée dans le temps, comme sur S3.
 */
router.get('/fichier/*', (req, res) => {
  const storage = getStorage();
  if (!(storage instanceof MemoryStorage)) return res.status(404).end();
  const file = storage.read(
    (req.params as Record<string, string>)[0],
    Number(req.query.e),
    String(req.query.s ?? ''),
  );
  if (!file) return res.status(403).json({ error: 'Lien expiré ou invalide' });
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.type(file.contentType).send(file.body);
});

router.use(requireAuth);

/** Fichier gardé en mémoire (jamais écrit sur le disque du serveur), 1 fichier, 10 Mo max. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0 },
});

async function ownPhotosResponse(userId: string) {
  const storage = getStorage();
  const rows = await listOwnPhotos(userId);
  return Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      position: p.position,
      width: p.width,
      height: p.height,
      url: await storage.signedUrl(p.storage_key, config.photos.urlTtlSeconds),
    })),
  );
}

/** GET /api/photos — ses propres photos (URL signées, nettes). */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ photos: await ownPhotosResponse(req.user!.sub) });
  }),
);

/** POST /api/photos — envoi d'une photo (multipart, champ « photo »). */
router.post(
  '/',
  rateLimit('photo-upload', 20, 60 * 60),
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Aucun fichier reçu (champ « photo »)');
    const photo = await addPhoto(req.user!.sub, req.file.buffer);
    res.status(201).json({ id: photo.id, photos: await ownPhotosResponse(req.user!.sub) });
  }),
);

/** DELETE /api/photos/:id — supprime la photo ET ses fichiers dans le bucket. */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deletePhoto(req.user!.sub, z.string().uuid().parse(req.params.id));
    res.status(204).end();
  }),
);

/** PUT /api/photos/order — { ids: [...] } dans l'ordre souhaité (la première est la photo principale). */
router.put(
  '/order',
  asyncHandler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.string().uuid()).max(6) }).parse(req.body);
    await reorderPhotos(req.user!.sub, ids);
    res.json({ photos: await ownPhotosResponse(req.user!.sub) });
  }),
);

export default router;
