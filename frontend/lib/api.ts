/**
 * L'API est servie sur le même domaine que le site (/api, /socket.io) :
 * par Caddy en production, par les réécritures de next.config.mjs en développement.
 * Une même image frontend fonctionne donc partout. Laisser vide sauf cas particulier.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * La session est portée par un cookie HttpOnly posé par l'API : le code du
 * navigateur ne voit jamais le jeton. Les requêtes vers /api (même domaine)
 * envoient ce cookie automatiquement (credentials: 'same-origin').
 */
const CREDENTIALS: RequestCredentials = 'same-origin';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: CREDENTIALS,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Erreur réseau');
  return data as T;
}

/** Envoi d'un fichier (multipart) : le navigateur fixe lui-même le Content-Type. */
export async function apiUpload<T>(path: string, field: string, file: File): Promise<T> {
  const body = new FormData();
  body.append(field, file);
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', body, credentials: CREDENTIALS });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Envoi impossible');
  return data as T;
}

/** Télécharge une réponse authentifiée sous forme de fichier (nom issu de Content-Disposition). */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { credentials: CREDENTIALS });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error ?? 'Téléchargement impossible');
  }

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
}
