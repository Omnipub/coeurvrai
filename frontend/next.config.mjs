/**
 * Pages privées (profils, découverte, chat, paramètres, onboarding, auth) :
 * jamais indexables. En plus de la meta robots et de robots.txt, chaque réponse
 * porte l'en-tête X-Robots-Tag. Doit rester aligné avec PRIVATE_PATHS (lib/site.ts).
 */
const PRIVATE_PATHS = [
  '/discover',
  '/matches',
  '/chat',
  '/settings',
  '/onboarding',
  '/verify-email',
  '/login',
  '/signup',
];

/** Hôtes des photos de profil servis optimisés par next/image (ex. CDN S3). */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? 'cdn.coeur-vrai.com')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https', hostname })),
  },
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }];
    return PRIVATE_PATHS.flatMap((p) => [
      { source: p, headers: noindex },
      { source: `${p}/:path*`, headers: noindex },
    ]);
  },
};

export default nextConfig;
