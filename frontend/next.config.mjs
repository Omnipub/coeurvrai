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

/**
 * Hôtes d'images optimisées par next/image. Vide par défaut : les photos de profil
 * sont servies par URL signées à durée courte, qui ne doivent pas être mises en cache.
 */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Image Docker minimale (serveur Node autonome, sans node_modules complet).
  output: 'standalone',
  /**
   * Développement sans Caddy : /api et /socket.io sont relayés vers le backend.
   * En production, Caddy les route avant d'atteindre Next.js.
   */
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:3001';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${backend}/socket.io/:path*` },
    ];
  },
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
