import type { MetadataRoute } from 'next';
import { PRIVATE_PATHS, SITE_URL, absoluteUrl } from '@/lib/site';

/**
 * robots.txt : pages privées exclues pour tous les robots (moteurs et IA).
 * Défense en profondeur : ces pages exigent aussi une connexion et envoient
 * `noindex, nofollow` (meta robots + en-tête X-Robots-Tag).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE_PATHS.map((p) => `${p}`) }],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
