import { defineConfig } from 'vitest/config';

/**
 * Tests d'intégration : ils utilisent une vraie base PostgreSQL et un vrai Redis.
 * La base de test est créée si besoin (tests/global-setup.ts) et vidée avant chaque test.
 *
 *   TEST_DATABASE_URL  (défaut : postgres://coeurvrai:coeurvrai@localhost:5432/coeurvrai_test)
 *   TEST_REDIS_URL     (défaut : redis://localhost:6379/15)
 */
const env = {
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? 'postgres://coeurvrai:coeurvrai@localhost:5432/coeurvrai_test',
  REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15',
  JWT_SECRET: 'test-secret',
  BCRYPT_ROUNDS: '4',
  CLEANUP_CRON: '',
  APP_URL: 'https://app.test',
  SMTP_URL: '',
  ONFIDO_API_TOKEN: '',
  ONFIDO_WEBHOOK_TOKEN: 'test-webhook-token',
};
Object.assign(process.env, env);

export default defineConfig({
  test: {
    env,
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // Base partagée : les fichiers de test s'exécutent l'un après l'autre.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
