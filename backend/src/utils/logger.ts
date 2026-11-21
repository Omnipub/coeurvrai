import crypto from 'crypto';

/**
 * Journal applicatif SANS DONNÉES PERSONNELLES (une ligne JSON par événement).
 *
 * Règles :
 *  - jamais de contenu de message, d'e-mail, de mot de passe, de jeton ni d'IP ;
 *  - les identifiants de membres sont pseudonymisés (HMAC tronqué, non réversible
 *    sans LOG_PSEUDONYM_KEY), ce qui permet de suivre un incident sans identifier ;
 *  - les erreurs PostgreSQL sont réduites à leur code et message : le champ
 *    `detail` (qui peut contenir une valeur, ex. un e-mail en doublon) est écarté.
 * Les journaux Docker sont limités en taille et tournent automatiquement
 * (docker-compose.prod.yml). Les IP de connexion sont conservées à part, chiffrées,
 * pendant 1 an (services/activity.ts).
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const pseudonymKey = process.env.LOG_PSEUDONYM_KEY || process.env.JWT_SECRET || 'dev';
const silent = () => process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS;

/** Pseudonyme stable d'un identifiant de membre (12 caractères). */
export function pseudonym(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return crypto.createHmac('sha256', pseudonymKey).update(id).digest('base64url').slice(0, 12);
}

/** Réduit une erreur à des informations sans données personnelles. */
export function safeError(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) return { error: String(err).slice(0, 200) };
  const e = err as Error & { code?: string; routine?: string };
  return {
    error: e.name,
    message: e.message.slice(0, 300),
    ...(e.code ? { code: e.code } : {}),
    ...(process.env.NODE_ENV !== 'production' && e.stack ? { stack: e.stack.split('\n').slice(0, 6).join('\n') } : {}),
  };
}

/** Masque les identifiants (UUID, jetons) dans un chemin et retire la query string. */
export function safePath(url: string): string {
  return url
    .split('?')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .slice(0, 200);
}

function write(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (silent()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields });
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, err?: unknown, fields?: Record<string, unknown>) =>
    write('error', msg, { ...(err === undefined ? {} : safeError(err)), ...fields }),
};
