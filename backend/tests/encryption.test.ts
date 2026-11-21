import { afterEach, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { CTX, decrypt, encrypt, isEncrypted, setKeyRing } from '../src/utils/crypto';
import { reencryptAll } from '../src/jobs/reencrypt';
import { api, auth, buildScenario, pool, setupTestDb } from './helpers';

setupTestDb();

const key = () => crypto.randomBytes(32).toString('base64');
const TEST_RING = process.env.ENCRYPTION_KEYS!;
afterEach(() => setKeyRing(TEST_RING));

describe('Chiffrement AES-256-GCM', () => {
  it('chiffre avec un IV aléatoire et authentifie le contexte', () => {
    const a = encrypt('Bonjour', CTX.messageContent);
    const b = encrypt('Bonjour', CTX.messageContent);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^enc:v1:test:/);
    expect(decrypt(a, CTX.messageContent)).toBe('Bonjour');
    // Recopié dans une autre colonne : indéchiffrable.
    expect(() => decrypt(a, CTX.reportDetails)).toThrow();
    // Altéré : indéchiffrable.
    const tampered = a.slice(0, -2) + (a.endsWith('A') ? 'B' : 'A');
    expect(() => decrypt(tampered, CTX.messageContent)).toThrow();
  });

  it('les données en clair antérieures restent lisibles', () => {
    expect(decrypt('ancien message', CTX.messageContent)).toBe('ancien message');
    expect(decrypt(null, CTX.messageContent)).toBeNull();
  });

  it('rotation : l’ancienne clé déchiffre, la nouvelle chiffre', () => {
    const k1 = key();
    const k2 = key();
    setKeyRing(`k1:${k1}`);
    const old = encrypt('secret', CTX.ip);
    setKeyRing(`k2:${k2},k1:${k1}`);
    expect(decrypt(old, CTX.ip)).toBe('secret');
    expect(encrypt('x', CTX.ip)).toMatch(/^enc:v1:k2:/);
    setKeyRing(`k2:${k2}`);
    expect(() => decrypt(old, CTX.ip)).toThrow(/k1/);
  });
});

describe('Champs chiffrés en base', () => {
  it('messages, signalements et IP ne sont jamais stockés en clair', async () => {
    const { hugo, lea, matchId } = await buildScenario();
    await api()
      .post('/api/reports')
      .set(auth(hugo))
      .send({ reportedId: lea.id, reason: 'autre', details: 'Détail très confidentiel' })
      .expect(201);

    const raw = await pool.query(
      `SELECT (SELECT string_agg(content, '|') FROM messages) AS messages,
              (SELECT string_agg(details, '|') FROM reports WHERE details IS NOT NULL) AS details,
              (SELECT string_agg(last_ip || ip_logs::text, '|') FROM users) AS ips`,
    );
    const dump = JSON.stringify(raw.rows[0]);
    expect(dump).not.toMatch(/Salut|confidentiel|203\.0\.113/);
    expect(raw.rows[0].details.split('|').every(isEncrypted)).toBe(true);

    // L'API renvoie le texte en clair aux personnes autorisées.
    const history = await api().get(`/api/likes/matches/${matchId}/messages`).set(auth(lea)).expect(200);
    expect(history.body.messages.map((m: { content: string }) => m.content)).toEqual(['Salut Léa', 'Salut Hugo']);
    const account = await api().get('/api/account').set(auth(hugo)).expect(200);
    expect(account.body.ipLogs[0].ip).toMatch(/^(203\.0\.113\.10|::ffff:127\.0\.0\.1|127\.0\.0\.1)$/);
  });

  it('re-chiffrement complet avec une nouvelle clé (rotation)', async () => {
    const { matchId, hugo } = await buildScenario();
    // Message antérieur au chiffrement, stocké en clair.
    await pool.query('INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3)', [
      matchId,
      hugo.id,
      'message en clair hérité',
    ]);

    const k2 = key();
    setKeyRing(`k2:${k2},${TEST_RING}`);
    const result = await reencryptAll();
    expect(result.messages).toBeGreaterThanOrEqual(3);

    const { rows } = await pool.query('SELECT content FROM messages');
    expect(rows.every((r) => r.content.startsWith('enc:v1:k2:'))).toBe(true);

    // L'ancienne clé peut être retirée : tout reste lisible.
    setKeyRing(`k2:${k2}`);
    expect(rows.map((r) => decrypt(r.content, CTX.messageContent))).toContain('message en clair hérité');
  });
});
