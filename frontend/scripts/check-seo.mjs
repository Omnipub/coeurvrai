#!/usr/bin/env node
/**
 * Audit SEO / confidentialité du frontend servi (next start).
 *   BASE_URL=http://localhost:3000 npm run check:seo
 *
 * Pages publiques (lues dans sitemap.xml) : title < 60, description < 155,
 * canonical, hreflang, Open Graph + Twitter avec image, un seul <h1>, HTML
 * sémantique, JSON-LD valide, images avec alt, marque « Cœur Vrai ».
 * Pages privées : noindex/nofollow (meta + X-Robots-Tag), exclues de robots.txt
 * et du sitemap.
 */
const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const BRAND = 'Cœur Vrai';
const PRIVATE = ['/discover', '/matches', '/chat/00000000-0000-0000-0000-000000000000', '/settings', '/settings/delete-account', '/settings/export-data', '/onboarding/verify-email', '/onboarding/identity', '/verify-email', '/login', '/signup'];
const EXPECTED_JSONLD = {
  '/': ['Organization', 'WebSite'],
  '/faq': ['FAQPage', 'BreadcrumbList'],
  '/guides/': ['Article', 'BreadcrumbList'],
};

let failures = 0;
const fail = (page, msg) => {
  failures++;
  console.log(`  ✗ ${page} — ${msg}`);
};

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (html, attr, name) => {
  const re = new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, 'i');
  const re2 = new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`, 'i');
  const m = re.exec(html) ?? re2.exec(html);
  return m ? decode(m[1]) : null;
};
const link = (html, rel, extra = '') => {
  const m = new RegExp(`<link[^>]*rel="${rel}"${extra}[^>]*href="([^"]*)"`, 'i').exec(html);
  return m ? m[1] : null;
};
const visibleText = (html) =>
  decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '));

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  return { res, text: await res.text() };
}

const { text: sitemap } = await get('/sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const siteOrigin = new URL(urls[0]).origin;
const paths = urls.map((u) => new URL(u).pathname);
console.log(`Pages publiques (sitemap) : ${paths.length}`);

const titles = new Map();
const descriptions = new Map();

for (const path of paths) {
  const { res, text: html } = await get(path);
  const before = failures;
  if (res.status !== 200) fail(path, `HTTP ${res.status}`);

  if (!/<html[^>]*lang="fr"/.test(html)) fail(path, 'html lang="fr" manquant');

  const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');
  if (!title) fail(path, 'title manquant');
  if (title.length >= 60) fail(path, `title trop long (${title.length}) : ${title}`);
  if (!title.includes(BRAND)) fail(path, `title sans la marque : ${title}`);
  if (titles.has(title)) fail(path, `title dupliqué avec ${titles.get(title)}`);
  titles.set(title, path);

  const desc = meta(html, 'name', 'description');
  if (!desc) fail(path, 'description manquante');
  else {
    if (desc.length >= 155) fail(path, `description trop longue (${desc.length})`);
    if (descriptions.has(desc)) fail(path, `description dupliquée avec ${descriptions.get(desc)}`);
    descriptions.set(desc, path);
  }

  const canonical = link(html, 'canonical');
  if (canonical !== siteOrigin + (path === '/' ? '' : path) && canonical !== siteOrigin + path) {
    fail(path, `canonical inattendu : ${canonical}`);
  }
  for (const lang of ['fr', 'fr-BE', 'fr-CH', 'fr-CA', 'x-default']) {
    if (!new RegExp(`<link[^>]*rel="alternate"[^>]*hrefLang="${lang}"`, 'i').test(html)) fail(path, `hreflang ${lang} manquant`);
  }

  const robots = meta(html, 'name', 'robots') ?? '';
  if (!/\bindex\b/.test(robots) || /noindex/.test(robots)) fail(path, `meta robots non indexable : ${robots}`);
  if (res.headers.get('x-robots-tag')) fail(path, 'X-Robots-Tag sur une page publique');

  for (const prop of ['og:title', 'og:description', 'og:url', 'og:image', 'og:site_name', 'og:locale']) {
    if (!meta(html, 'property', prop)) fail(path, `${prop} manquant`);
  }
  if (meta(html, 'property', 'og:site_name') !== BRAND) fail(path, 'og:site_name ≠ marque');
  if (meta(html, 'name', 'twitter:card') !== 'summary_large_image') fail(path, 'twitter:card manquant');
  const ogImage = meta(html, 'property', 'og:image');
  if (!meta(html, 'name', 'twitter:image')) fail(path, 'twitter:image manquant');
  if (ogImage) {
    const img = await fetch(BASE + new URL(ogImage).pathname);
    if (img.status !== 200 || img.headers.get('content-type') !== 'image/png') fail(path, `image OG invalide (${img.status})`);
  }

  const h1 = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1 !== 1) fail(path, `${h1} balises <h1>`);
  for (const tag of ['header', 'main', 'nav', 'footer']) {
    if (!new RegExp(`<${tag}[\\s>]`).test(html)) fail(path, `<${tag}> manquant`);
  }
  // Hiérarchie : pas de saut de niveau (ex. h2 → h4).
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  levels.forEach((l, i) => i > 0 && l > levels[i - 1] + 1 && fail(path, `saut de titre h${levels[i - 1]} → h${l}`));

  for (const img of html.match(/<img[^>]*>/g) ?? []) {
    if (!/\balt="/.test(img)) fail(path, `image sans alt : ${img.slice(0, 80)}`);
  }

  // Réponse directe : un paragraphe substantiel juste après le h1.
  const afterH1 = html.split(/<\/h1>/)[1] ?? '';
  const firstP = /<p[^>]*>([\s\S]*?)<\/p>/.exec(afterH1)?.[1] ?? '';
  const firstText = visibleText(firstP).replace(/\s+/g, ' ').trim();
  if (firstText.length < 120) fail(path, `premier paragraphe trop court pour répondre (${firstText.length} car.)`);

  const types = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
    try {
      const data = JSON.parse(m[1]);
      return (Array.isArray(data) ? data : [data]).map((d) => d['@type']);
    } catch {
      fail(path, 'JSON-LD invalide');
      return [];
    }
  });
  const expected = Object.entries(EXPECTED_JSONLD).find(([k]) => (k.endsWith('/') && k !== '/' ? path.startsWith(k) && path !== k.slice(0, -1) : path === k))?.[1];
  for (const t of expected ?? []) if (!types.includes(t)) fail(path, `JSON-LD ${t} manquant`);
  if (path !== '/' && !types.includes('BreadcrumbList')) fail(path, 'BreadcrumbList manquant');

  if (/coeur-vrai(?!\.com)/i.test(visibleText(html).replace(/coeur-vrai\.com/gi, ''))) fail(path, 'marque écrite « coeur-vrai » au lieu de « Cœur Vrai »');

  if (failures === before) console.log(`  ✓ ${path}  (${title.length} / ${desc?.length ?? 0} car., JSON-LD : ${types.join(', ') || '—'})`);
}

console.log('\nPages privées');
const { text: robotsTxt } = await get('/robots.txt');
for (const path of PRIVATE) {
  const before = failures;
  const { res, text: html } = await get(path);
  const robots = meta(html, 'name', 'robots') ?? '';
  if (!/noindex/.test(robots) || !/nofollow/.test(robots)) fail(path, `meta robots : « ${robots} »`);
  if (!/noindex/.test(res.headers.get('x-robots-tag') ?? '')) fail(path, 'en-tête X-Robots-Tag absent');
  const prefix = '/' + path.split('/')[1];
  if (!robotsTxt.includes(`Disallow: ${prefix}`)) fail(path, `absent de robots.txt (${prefix})`);
  if (paths.some((p) => p.startsWith(prefix))) fail(path, 'présent dans le sitemap');
  if (/og:title|application\/ld\+json/.test(html) && /"Person"|display_name/.test(html)) fail(path, 'données de profil dans le HTML');
  if (failures === before) console.log(`  ✓ ${path}`);
}

console.log('\nFichiers');
const llms = await get('/llms.txt');
if (llms.res.status !== 200 || !llms.res.headers.get('content-type')?.startsWith('text/plain') || !llms.text.startsWith(`# ${BRAND}`)) {
  fail('/llms.txt', 'absent ou mal formé');
} else console.log('  ✓ /llms.txt');
if (!/Sitemap: /.test(robotsTxt)) fail('/robots.txt', 'Sitemap manquant');
else console.log('  ✓ /robots.txt');

console.log(failures ? `\n${failures} problème(s)` : '\nAucun problème');
process.exitCode = failures ? 1 : 0;
