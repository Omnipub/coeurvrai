import crypto from 'crypto';

/**
 * Chiffrement applicatif AES-256-GCM des champs sensibles qui ne servent à aucun
 * filtre en base (contenu des messages, détails des signalements, adresses IP).
 *
 * Format stocké : enc:v1:<idClé>:<iv>:<tag>:<chiffré>   (base64url)
 *  - une clé par identifiant (rotation possible sans tout casser) ;
 *  - un « contexte » (ex. « messages.content ») authentifié avec le chiffré : un
 *    chiffré recopié dans une autre colonne devient indéchiffrable.
 *
 * Clés : ENCRYPTION_KEYS="k2:<base64 32 octets>,k1:<base64 32 octets>"
 * La PREMIÈRE clé chiffre ; toutes servent à déchiffrer. Génération :
 * infra/generate-secrets.sh (ou `openssl rand -base64 32`).
 */
const PREFIX = 'enc:v1:';
const DEV_KEY = 'dev:' + Buffer.alloc(32, 7).toString('base64'); // développement et tests uniquement

interface KeyRing {
  activeId: string;
  keys: Map<string, Buffer>;
}

export function parseKeyRing(spec: string): KeyRing {
  const keys = new Map<string, Buffer>();
  let activeId = '';
  for (const part of spec.split(',').map((p) => p.trim()).filter(Boolean)) {
    const idx = part.indexOf(':');
    const id = part.slice(0, idx);
    const key = Buffer.from(part.slice(idx + 1), 'base64');
    if (!/^[a-z0-9]{1,16}$/i.test(id) || key.length !== 32) {
      throw new Error('ENCRYPTION_KEYS invalide : attendu « id:<32 octets en base64> », séparés par des virgules');
    }
    keys.set(id, key);
    activeId ||= id;
  }
  if (!activeId) throw new Error('ENCRYPTION_KEYS vide');
  return { activeId, keys };
}

function loadKeyRing(): KeyRing {
  const spec = process.env.ENCRYPTION_KEYS;
  if (!spec) {
    if (process.env.NODE_ENV === 'production') throw new Error('ENCRYPTION_KEYS doit être défini en production');
    return parseKeyRing(DEV_KEY);
  }
  return parseKeyRing(spec);
}

let ring = loadKeyRing();

/** Remplace le trousseau (tests, rotation). */
export function setKeyRing(spec: string): void {
  ring = parseKeyRing(spec);
}

export function activeKeyId(): string {
  return ring.activeId;
}

export function encrypt(plain: string, context: string): string {
  const key = ring.keys.get(ring.activeId)!;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX + ring.activeId, iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join(':');
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Déchiffre ; une valeur en clair (données antérieures au chiffrement) est rendue telle quelle. */
export function decrypt(value: string, context: string): string;
export function decrypt(value: string | null, context: string): string | null;
export function decrypt(value: string | null, context: string): string | null {
  if (value === null || !isEncrypted(value)) return value;
  const [keyId, iv, tag, ct] = value.slice(PREFIX.length).split(':');
  const key = ring.keys.get(keyId);
  if (!key) throw new Error(`Clé de chiffrement « ${keyId} » absente de ENCRYPTION_KEYS`);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(context, 'utf8'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
}

export const encryptNullable = (value: string | null | undefined, context: string) =>
  value === null || value === undefined ? null : encrypt(value, context);

/**
 * Empreinte HMAC-SHA256 déterministe (comparaison d'égalité sans déchiffrer,
 * ex. « l'IP a-t-elle changé ? »). Clé dérivée (HKDF) de la clé active.
 */
export function blindIndex(value: string, context: string): string {
  const key = Buffer.from(
    crypto.hkdfSync('sha256', ring.keys.get(ring.activeId)!, Buffer.alloc(0), `blind-index:${context}`, 32),
  );
  return crypto.createHmac('sha256', key).update(value).digest('base64url');
}

/** Contextes : un par colonne chiffrée. */
export const CTX = {
  messageContent: 'messages.content',
  reportDetails: 'reports.details',
  reportResolution: 'reports.resolution_note',
  ip: 'users.ip',
} as const;
