import type { MetadataRoute } from 'next';
import { NOINDEX_EVERYTHING, PRIVATE_PATHS, SITE_URL, absoluteUrl } from '@/lib/site';

/**
 * robots.txt : pages privées exclues pour tous les robots (moteurs et IA).
 * Défense en profondeur : ces pages exigent aussi une connexion et envoient
 * `noindex, nofollow` (meta robots + en-tête X-Robots-Tag).
 */
export default function robots(): MetadataRoute.Robots {
  // Site de test : tout est interdit aux robots.
  if (NOINDEX_EVERYTHING) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE_PATHS.map((p) => `${p}`) }],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
