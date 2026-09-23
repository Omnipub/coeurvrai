import type { MetadataRoute } from 'next';
import { ALL_PAGES } from '@/lib/content/pages';
import { GUIDES } from '@/lib/content/guides';
import { hreflangAlternates } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

/** Sitemap des seules pages publiques. Aucune page privée n'y figure. */
export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (path: string, lastModified: string, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'], priority: number) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(
        Object.entries(hreflangAlternates(path)).map(([lang, p]) => [lang, p.startsWith('http') ? p : absoluteUrl(p)]),
      ),
    },
  });

  return [
    ...ALL_PAGES.map((p) => entry(p.path, p.updated, p.changeFrequency, p.priority)),
    ...GUIDES.map((g) => entry(`/guides/${g.slug}`, g.updated, 'monthly', 0.7)),
  ];
}
