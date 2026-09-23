import type { Metadata } from 'next';
import { BRAND, HREFLANG_BASES, SITE_URL } from './site';
import type { PublicPage } from './content/pages';

export const TITLE_SUFFIX = ` | ${BRAND}`;

/** Alternatives hreflang (fr, fr-FR, fr-BE, fr-CH, fr-CA + x-default). */
export function hreflangAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const [lang, base] of Object.entries(HREFLANG_BASES)) {
    languages[lang] = base ? `${base.replace(/\/$/, '')}${path}` : path;
  }
  languages['x-default'] = path;
  return languages;
}

interface SeoInput {
  title: string;
  absoluteTitle?: string;
  description: string;
  path: string;
  /** Clé de l'image Open Graph générée (/og/<key>). */
  ogKey: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Métadonnées d'une page publique indexable : title, description, canonical,
 * hreflang, Open Graph et Twitter card avec image dédiée.
 * (Le layout racine rend tout le site `noindex` par défaut ; seules les pages
 * passant par cette fonction deviennent indexables.)
 */
export function buildMetadata(input: SeoInput): Metadata {
  const fullTitle = input.absoluteTitle ?? `${input.title}${TITLE_SUFFIX}`;
  const image = {
    url: `/og/${input.ogKey}`,
    width: 1200,
    height: 630,
    alt: `${input.absoluteTitle ?? input.title} — ${BRAND}`,
    type: 'image/png',
  };

  return {
    title: input.absoluteTitle ? { absolute: input.absoluteTitle } : input.title,
    description: input.description,
    alternates: { canonical: input.path, languages: hreflangAlternates(input.path) },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      type: input.type ?? 'website',
      locale: 'fr_FR',
      alternateLocale: ['fr_BE', 'fr_CH', 'fr_CA'],
      siteName: BRAND,
      url: input.path,
      title: fullTitle,
      description: input.description,
      images: [image],
      ...(input.type === 'article'
        ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime, authors: [SITE_URL] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: input.description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}

export function pageMetadata(page: PublicPage): Metadata {
  return buildMetadata({
    title: page.title,
    absoluteTitle: page.absoluteTitle,
    description: page.description,
    path: page.path,
    ogKey: page.key,
  });
}
