'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api, apiUpload } from '@/lib/api';
import type { OwnPhoto } from '@/types';
import { ProfilePhoto } from './ProfilePhoto';

const MAX_PHOTOS = 6;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Gestion de ses photos : envoi, suppression, choix de la photo principale.
 * Le serveur retire les métadonnées (dont la position GPS), redimensionne et
 * convertit en WebP ; les URL affichées expirent au bout de quelques minutes.
 */
export function PhotoManager() {
  const [photos, setPhotos] = useState<OwnPhoto[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<{ photos: OwnPhoto[] }>('/api/photos')
      .then((r) => setPhotos(r.photos))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) return setError('Fichier trop volumineux (10 Mo maximum).');
    setPending(true);
    setError(null);
    try {
      const r = await apiUpload<{ photos: OwnPhoto[] }>('/api/photos', 'photo', file);
      setPhotos(r.photos);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement cette photo ?')) return;
    await api(`/api/photos/${id}`, { method: 'DELETE' });
    load();
  }

  async function makeMain(id: string) {
    if (!photos) return;
    const ids = [id, ...photos.filter((p) => p.id !== id).map((p) => p.id)];
    const r = await api<{ photos: OwnPhoto[] }>('/api/photos/order', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    });
    setPhotos(r.photos);
  }

  if (!photos) return <p className="text-sm text-gray-600">{error ?? 'Chargement…'}</p>;

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <li key={p.id} className="space-y-1">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-coeur-100">
              <ProfilePhoto
                src={p.url}
                alt={i === 0 ? 'Votre photo principale' : `Votre photo ${i + 1}`}
                sizes="(max-width: 672px) 33vw, 200px"
              />
            </div>
            <div className="flex flex-wrap gap-x-2 text-xs">
              {i === 0 ? (
                <span className="font-medium text-coeur-700">Principale</span>
              ) : (
                <button onClick={() => makeMain(p.id)} className="underline">
                  Principale
                </button>
              )}
              <button onClick={() => remove(p.id)} className="text-red-700 underline">
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>

      {photos.length < MAX_PHOTOS && (
        <div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFile}
            className="sr-only"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="inline-block cursor-pointer rounded-full border border-coeur-600 px-4 py-2 text-sm font-medium text-coeur-700 focus-within:outline"
          >
            {pending ? 'Envoi…' : 'Ajouter une photo'}
          </label>
          <p className="mt-1 text-xs text-gray-600">
            JPEG, PNG ou WebP, 10 Mo maximum, {MAX_PHOTOS} photos au plus. La localisation et les
            autres métadonnées sont supprimées automatiquement.
          </p>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
