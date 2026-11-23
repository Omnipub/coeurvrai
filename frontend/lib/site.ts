/** Identité du site : source unique du nom de marque et des URL publiques. */

/** Nom de marque — à utiliser partout à l'identique (textes, metadata, JSON-LD). */
export const BRAND = 'Cœur Vrai';

const rawSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://coeurvrai.com').replace(/\/$/, '');
export const SITE_URL = /^https?:\/\//.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

export const SITE_DESCRIPTION =
  'Cœur Vrai est un site de rencontre sérieux et bienveillant entre hommes et femmes trans, ' +
  'gratuit, discret et modéré par des humains.';

export const CONTACT_EMAIL = 'contact@coeurvrai.com';

/**
 * Variantes régionales du français. Le contenu est aujourd'hui identique :
 * toutes pointent vers la même URL (une page peut cibler plusieurs régions).
 * Pour une version dédiée (ex. prix en CHF), remplacer `null` par son URL de base.
 */
export const HREFLANG_BASES: Record<string, string | null> = {
  fr: null,
  'fr-FR': null,
  'fr-BE': null,
  'fr-CH': null,
  'fr-CA': null,
};

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}` || SITE_URL;
}

/** Site de test (Render) : rien n'est indexable, même les pages publiques. */
export const NOINDEX_EVERYTHING = process.env.NEXT_PUBLIC_NOINDEX === 'true';

/** Préfixes des pages privées : jamais indexées (meta robots, X-Robots-Tag, robots.txt). */
export const PRIVATE_PATHS = [
  '/discover',
  '/matches',
  '/chat',
  '/settings',
  '/onboarding',
  '/verify-email',
  '/login',
  '/signup',
];
