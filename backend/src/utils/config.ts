import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

/**
 * Environnement de TEST en ligne (Render, données fictives uniquement) : DEPLOY_ENV=staging.
 * Autorise le stockage des photos en mémoire et l'affichage des e-mails dans les journaux.
 * Jamais en production.
 */
const isStaging = process.env.DEPLOY_ENV === 'staging';
/** Nom d'hôte public fourni par l'hébergeur (ex. Render) : sert d'origine par défaut. */
const publicOrigin = process.env.PUBLIC_HOST ? `https://${process.env.PUBLIC_HOST}` : undefined;
const defaultOrigin = process.env.CORS_ORIGIN ?? publicOrigin ?? 'http://localhost:3000';

export const config = {
  isStaging,
  /** Nombre de relais (reverse proxies) devant l'API : 1 derrière Caddy. */
  trustProxy: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: defaultOrigin,
  /** Origines acceptées pour les requêtes avec cookie (CSRF) et le WebSocket du chat. */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? defaultOrigin)
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
  /** Cookie de session réservé à HTTPS (toujours vrai en production). */
  cookieSecure: (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true',
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  /** Expression cron des purges RGPD ; vide pour désactiver (ex. instances secondaires). */
  cleanupCron: process.env.CLEANUP_CRON ?? '0 3 * * *',
  /** URL publique du frontend, utilisée dans les liens envoyés par e-mail. */
  appUrl: (process.env.APP_URL ?? defaultOrigin).replace(/\/$/, ''),
  /** SMTP (ex. smtps://user:pass@smtp.exemple.fr:465). Vide : e-mails journalisés, non envoyés. */
  smtpUrl: process.env.SMTP_URL ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'Cœur Vrai <no-reply@coeurvrai.com>',
  /**
   * Stockage objet compatible S3 (OVH Object Storage en production, MinIO en local).
   * Sans S3_BUCKET_PHOTOS : stockage en mémoire (tests uniquement, interdit en production).
   */
  storage: {
    bucketPhotos: process.env.S3_BUCKET_PHOTOS ?? '',
    endpoint: process.env.S3_ENDPOINT ?? '',
    /** Point d'accès vu par les navigateurs, utilisé pour signer les URL (souvent identique). */
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION ?? 'gra',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  },
  photos: {
    /** Durée de vie des URL signées (5 à 15 minutes). */
    urlTtlSeconds: Math.min(900, Math.max(300, Number(process.env.PHOTO_URL_TTL_SECONDS ?? 600))),
    /**
     * Photos floutées pour les comptes hommes sans abonnement actif.
     * Désactivé tant que l'abonnement n'existe pas (voir services/photos.ts).
     */
    blurForNonSubscribers: process.env.PHOTO_BLUR_FOR_NON_SUBSCRIBERS === 'true',
  },
  onfido: {
    apiToken: process.env.ONFIDO_API_TOKEN ?? '',
    region: (process.env.ONFIDO_REGION ?? 'EU').toUpperCase() as 'EU' | 'US' | 'CA',
    workflowId: process.env.ONFIDO_WORKFLOW_ID ?? '',
    webhookToken: process.env.ONFIDO_WEBHOOK_TOKEN ?? '',
  },
};

if (config.env === 'production' && !config.cookieSecure) {
  throw new Error('COOKIE_SECURE ne peut pas être désactivé en production');
}

if (config.env === 'production' && !config.storage.bucketPhotos && !config.isStaging) {
  throw new Error('S3_BUCKET_PHOTOS doit être défini en production');
}

if (config.env === 'production' && config.jwtSecret === 'change-me') {
  throw new Error('JWT_SECRET doit être défini en production');
}
