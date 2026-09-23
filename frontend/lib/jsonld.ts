import { BRAND, CONTACT_EMAIL, SITE_DESCRIPTION, SITE_URL, absoluteUrl } from './site';
import type { FaqItem } from './content/faq';
import type { Guide } from './content/guides';

/** Données structurées schema.org (JSON-LD). */

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BRAND,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/og/logo'), width: 512, height: 512 },
    description: SITE_DESCRIPTION,
    email: CONTACT_EMAIL,
    areaServed: ['FR', 'BE', 'CH', 'CA'],
    knowsLanguage: 'fr',
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: BRAND,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'fr',
    publisher: { '@id': ORG_ID },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function faqPageJsonLd(items: FaqItem[], dateModified: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'fr',
    dateModified,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function articleJsonLd(guide: Guide) {
  const url = absoluteUrl(`/guides/${guide.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.headline,
    description: guide.description,
    abstract: guide.summary,
    inLanguage: 'fr',
    datePublished: guide.published,
    dateModified: guide.updated,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    image: absoluteUrl(`/og/guide-${guide.slug}`),
    author: { '@type': 'Organization', '@id': ORG_ID, name: BRAND, url: SITE_URL },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    timeRequired: `PT${guide.readingMinutes}M`,
  };
}
