import { afterAll, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/utils/db';
import { connectRedis, redis } from '../src/utils/redis';
import { outbox } from '../src/services/mailer';
import { setOnfidoClient } from '../src/services/onfido';
import { MemoryStorage, setStorage } from '../src/services/storage';
import sharp from 'sharp';
import { CTX, encrypt } from '../src/utils/crypto';

export const { app, io } = createApp();
export const api = () => request(app);
export { pool };

/** Branche le cycle de vie commun : base et Redis vides avant chaque test. */
export function setupTestDb(): void {
  beforeAll(async () => {
    await connectRedis();
    defaultPhoto ??= await jpegWithGps(800, 600);
  });
  beforeEach(async () => {
    await redis.flushDb();
    await pool.query('TRUNCATE users, reports RESTART IDENTITY CASCADE');
    outbox.length = 0;
    setOnfidoClient(null);
    storage = new MemoryStorage();
    setStorage(storage);
  });
  afterAll(async () => {
    io.close();
    await redis.quit();
    await pool.end();
  });
}

/** Stockage en mémoire du test courant (réinitialisé avant chaque test). */
export let storage = new MemoryStorage();

/** Génère une vraie image JPEG, avec des métadonnées EXIF dont une position GPS. */
export async function jpegWithGps(width = 2400, height = 1800): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 60, b: 90 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'TestPhone', Model: 'Modele-X', Copyright: 'Hugo' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '48/1 51/1 2400/100',
        GPSLongitudeRef: 'E',
        GPSLongitude: '2/1 21/1 300/100',
      },
    })
    .toBuffer();
}

/** Image par défaut, générée une fois (beforeAll). */
let defaultPhoto: Buffer;

export function uploadPhoto(user: TestUser, image?: Buffer, filename = 'photo.jpg') {
  return api().post('/api/photos').set(auth(user)).attach('photo', image ?? defaultPhoto, filename);
}

export interface TestUser {
  id: string;
  token: string;
  email: string;
  password: string;
}

let counter = 0;

export async function signup(
  accountType: 'homme' | 'femme_trans',
  displayName: string,
  ip = '203.0.113.10',
): Promise<TestUser> {
  const email = `${displayName.toLowerCase()}${++counter}@test.fr`;
  const password = 'motdepasse123';
  const res = await api()
    .post('/api/auth/signup')
    .set('X-Forwarded-For', ip)
    .send({
      email,
      password,
      accountType,
      birthdate: '1990-06-15',
      displayName,
      acceptTerms: true,
      gdprConsent: true,
    })
    .expect(201);
  return { id: res.body.user.id, token: res.body.token, email, password };
}

export const auth = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });

/** Jeton du dernier lien de vérification envoyé à `email`. */
export function lastVerificationToken(email: string): string {
  const mail = [...outbox].reverse().find((m) => m.to === email);
  if (!mail) throw new Error(`Aucun e-mail envoyé à ${email}`);
  const match = /\/verify-email\?token=([A-Za-z0-9_-]+)/.exec(mail.text);
  if (!match) throw new Error('Lien de vérification introuvable');
  return decodeURIComponent(match[1]);
}

export { outbox };

/** Insère un message directement, chiffré comme le fait le chat (Socket.io). */
export async function insertMessage(matchId: string, senderId: string, content: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    'INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id',
    [matchId, senderId, encrypt(content, CTX.messageContent)],
  );
  return rows[0].id;
}

/** Nombre de lignes de `table` satisfaisant `where` (avec $1 = id). */
export async function count(table: string, where: string, id: string): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where}`,
    [id],
  );
  return rows[0].n;
}

/** Attend qu'une condition asynchrone devienne vraie (écritures « fire-and-forget »). */
export async function waitFor(check: () => Promise<boolean>, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error('Condition non atteinte');
    await new Promise((r) => setTimeout(r, 25));
  }
}

/**
 * Scénario complet autour de Hugo (homme) :
 *  - match avec Léa + messages dans les deux sens ;
 *  - like de Hugo vers Sara, like de Nina vers Hugo ;
 *  - Hugo bloque Nina ; Hugo signale Sara ; Léa signale Hugo ;
 *  - Hugo a deux photos sur son profil (fichiers dans le stockage).
 *  - Léa réserve ses photos à ses matchs et en a une.
 */
export async function buildScenario() {
  const hugo = await signup('homme', 'Hugo');
  const lea = await signup('femme_trans', 'Lea');
  const sara = await signup('femme_trans', 'Sara');
  const nina = await signup('femme_trans', 'Nina');

  await api()
    .put('/api/profiles/me')
    .set(auth(hugo))
    .send({ bio: 'Bonjour' })
    .expect(200);
  await uploadPhoto(hugo).expect(201);
  await uploadPhoto(hugo).expect(201);
  await api().put('/api/profiles/me').set(auth(lea)).send({ photosMatchesOnly: true }).expect(200);
  await uploadPhoto(lea).expect(201);

  await api().post(`/api/likes/${lea.id}`).set(auth(hugo)).expect(201);
  const match = await api().post(`/api/likes/${hugo.id}`).set(auth(lea)).expect(201);
  const matchId: string = match.body.matchId;

  const hugoMsg = await insertMessage(matchId, hugo.id, 'Salut Léa');
  const leaMsg = await insertMessage(matchId, lea.id, 'Salut Hugo');

  await api().post(`/api/likes/${sara.id}`).set(auth(hugo)).expect(201);
  await api().post(`/api/likes/${hugo.id}`).set(auth(nina)).expect(201);
  await api().post(`/api/blocks/${nina.id}`).set(auth(hugo)).expect(204);
  await api().post('/api/reports').set(auth(hugo)).send({ reportedId: sara.id, reason: 'faux_profil' }).expect(201);
  await api()
    .post('/api/reports')
    .set(auth(lea))
    .send({ reportedId: hugo.id, reason: 'harcelement', messageId: hugoMsg })
    .expect(201);

  return { hugo, lea, sara, nina, matchId, hugoMsg, leaMsg };
}
