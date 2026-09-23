import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  /** Expression cron des purges RGPD ; vide pour désactiver (ex. instances secondaires). */
  cleanupCron: process.env.CLEANUP_CRON ?? '0 3 * * *',
  /** URL publique du frontend, utilisée dans les liens envoyés par e-mail. */
  appUrl: (process.env.APP_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, ''),
  /** SMTP (ex. smtps://user:pass@smtp.exemple.fr:465). Vide : e-mails journalisés, non envoyés. */
  smtpUrl: process.env.SMTP_URL ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'coeur-vrai <no-reply@coeur-vrai.com>',
  onfido: {
    apiToken: process.env.ONFIDO_API_TOKEN ?? '',
    region: (process.env.ONFIDO_REGION ?? 'EU').toUpperCase() as 'EU' | 'US' | 'CA',
    workflowId: process.env.ONFIDO_WORKFLOW_ID ?? '',
    webhookToken: process.env.ONFIDO_WEBHOOK_TOKEN ?? '',
  },
};

if (config.env === 'production' && config.jwtSecret === 'change-me') {
  throw new Error('JWT_SECRET doit être défini en production');
}
