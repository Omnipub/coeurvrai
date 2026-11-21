import crypto from 'crypto';
import sharp from 'sharp';
import { pool } from '../utils/db';
import { config } from '../utils/config';
import { HttpError } from '../utils/http';
import { AccountType } from '../models/types';
import { getStorage } from './storage';

export const MAX_PHOTOS = 6;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Formats acceptés, d'après le CONTENU du fichier (jamais d'après son nom ou son type déclaré). */
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
/** Protection contre les « bombes de décompression » (images gigantesques). */
const MAX_INPUT_PIXELS = 40_000_000;

export interface ProcessedPhoto {
  clear: Buffer;
  blurred: Buffer;
  width: number;
  height: number;
}

/**
 * Prépare une photo envoyée par un membre :
 *  - vérifie le format réel (JPEG, PNG ou WebP) ;
 *  - applique l'orientation EXIF puis SUPPRIME TOUTES LES MÉTADONNÉES (GPS, appareil,
 *    date…) : sharp n'en recopie aucune sans appel explicite à withMetadata() ;
 *  - redimensionne (1600 px maximum) et convertit en WebP ;
 *  - produit une version floutée, servie quand la photo nette n'est pas autorisée.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()).format;
  } catch {
    throw new HttpError(400, 'Fichier image illisible');
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new HttpError(400, 'Format non accepté : JPEG, PNG ou WebP uniquement');
  }

  try {
    const { data: clear, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    const blurred = await sharp(clear)
      .resize({ width: 480, height: 480, fit: 'inside' })
      .blur(28)
      .webp({ quality: 55 })
      .toBuffer();

    return { clear, blurred, width: info.width, height: info.height };
  } catch {
    throw new HttpError(400, 'Impossible de traiter cette image');
  }
}

export interface PhotoRow {
  id: string;
  position: number;
  storage_key: string;
  blur_key: string;
  width: number;
  height: number;
  created_at: Date;
}

/** Préfixe des objets d'un membre dans le bucket. */
export const userPrefix = (userId: string) => `photos/${userId}/`;

export async function addPhoto(userId: string, input: Buffer): Promise<PhotoRow> {
  const { rows: countRows } = await pool.query<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM photos WHERE user_id = $1',
    [userId],
  );
  if (countRows[0].n >= MAX_PHOTOS) throw new HttpError(409, `${MAX_PHOTOS} photos maximum`);

  const photo = await processPhoto(input);
  const id = crypto.randomUUID();
  const key = `${userPrefix(userId)}${id}.webp`;
  const blurKey = `${userPrefix(userId)}${id}-flou.webp`;

  const storage = getStorage();
  await storage.put(key, photo.clear, 'image/webp');
  await storage.put(blurKey, photo.blurred, 'image/webp');

  try {
    const { rows } = await pool.query<PhotoRow>(
      `INSERT INTO photos (id, user_id, position, storage_key, blur_key, width, height)
       VALUES ($1, $2, (SELECT COALESCE(MAX(position) + 1, 0) FROM photos WHERE user_id = $2), $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, key, blurKey, photo.width, photo.height],
    );
    return rows[0];
  } catch (err) {
    await storage.deleteKeys([key, blurKey]).catch(() => undefined);
    throw err;
  }
}

export async function deletePhoto(userId: string, photoId: string): Promise<void> {
  const { rows } = await pool.query<PhotoRow>(
    'DELETE FROM photos WHERE id = $1 AND user_id = $2 RETURNING *',
    [photoId, userId],
  );
  if (!rows[0]) throw new HttpError(404, 'Photo introuvable');
  await getStorage().deleteKeys([rows[0].storage_key, rows[0].blur_key]);
  // Renumérote les positions restantes (0, 1, 2…).
  await pool.query(
    `UPDATE photos p SET position = r.pos - 1
       FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY position) AS pos FROM photos WHERE user_id = $1) r
      WHERE p.id = r.id`,
    [userId],
  );
}

export async function reorderPhotos(userId: string, ids: string[]): Promise<void> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM photos WHERE user_id = $1', [userId]);
  const own = new Set(rows.map((r) => r.id));
  if (ids.length !== own.size || !ids.every((id) => own.has(id))) {
    throw new HttpError(400, 'Liste de photos invalide');
  }
  await pool.query(
    `UPDATE photos p SET position = o.pos - 1
       FROM unnest($2::uuid[]) WITH ORDINALITY AS o(id, pos)
      WHERE p.id = o.id AND p.user_id = $1`,
    [userId, ids],
  );
}

export async function listOwnPhotos(userId: string): Promise<PhotoRow[]> {
  const { rows } = await pool.query<PhotoRow>(
    'SELECT * FROM photos WHERE user_id = $1 ORDER BY position',
    [userId],
  );
  return rows;
}

/** Supprime réellement tous les fichiers d'un membre dans le bucket (suppression de compte). */
export async function deleteUserFiles(userIds: string[]): Promise<void> {
  const storage = getStorage();
  for (const id of userIds) {
    await storage.deletePrefix(userPrefix(id)).catch((err) => {
      // Rattrapé par purgeOrphanPhotos (jobs/cleanup.ts) lors du prochain nettoyage.
      console.error('[photos] suppression des fichiers impossible :', (err as Error).message);
    });
  }
}

export interface Viewer {
  id: string;
  accountType: AccountType;
}

/**
 * Abonnement actif du membre.
 * TODO : l'abonnement n'existe pas encore (Stripe). Tant qu'il n'existe pas, et que
 * PHOTO_BLUR_FOR_NON_SUBSCRIBERS vaut false, aucun homme n'est concerné par le floutage.
 */
async function hasActiveSubscription(_userId: string): Promise<boolean> {
  return false;
}

/**
 * Règles de visibilité, appliquées CÔTÉ SERVEUR : la version nette n'est jamais
 * signée pour quelqu'un qui n'y a pas droit.
 *  - on voit toujours ses propres photos nettes ;
 *  - photos d'une femme trans réservées aux matchs → floutées avant le match ;
 *  - (option) photos floutées pour les hommes sans abonnement.
 */
export async function canSeeClearPhotos(
  viewer: Viewer,
  owner: { id: string; accountType: AccountType; photosMatchesOnly?: boolean },
  matched: boolean,
): Promise<boolean> {
  if (viewer.id === owner.id) return true;
  if (owner.accountType === 'femme_trans' && owner.photosMatchesOnly && !matched) return false;
  if (config.photos.blurForNonSubscribers && viewer.accountType === 'homme') {
    return hasActiveSubscription(viewer.id);
  }
  return true;
}

export interface PhotoKeys {
  key: string;
  blur: string;
}

/** Signe les URL (nettes ou floutées) d'une liste de photos. */
export async function signPhotos(photos: PhotoKeys[], clear: boolean): Promise<string[]> {
  const storage = getStorage();
  const ttl = config.photos.urlTtlSeconds;
  return Promise.all(photos.map((p) => storage.signedUrl(clear ? p.key : p.blur, ttl)));
}

/** Expression SQL : photos d'un membre (alias `u`), ordonnées, au format PhotoKeys[]. */
export const PHOTO_KEYS_SQL = `COALESCE((
  SELECT json_agg(json_build_object('key', ph.storage_key, 'blur', ph.blur_key) ORDER BY ph.position)
    FROM photos ph WHERE ph.user_id = u.id
), '[]'::json)`;
