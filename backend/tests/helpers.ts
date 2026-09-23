import { afterAll, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/utils/db';
import { connectRedis, redis } from '../src/utils/redis';

export const { app, io } = createApp();
export const api = () => request(app);
export { pool };

/** Branche le cycle de vie commun : base et Redis vides avant chaque test. */
export function setupTestDb(): void {
  beforeAll(async () => {
    await connectRedis();
  });
  beforeEach(async () => {
    await redis.flushDb();
    await pool.query('TRUNCATE users, reports RESTART IDENTITY CASCADE');
  });
  afterAll(async () => {
    io.close();
    await redis.quit();
    await pool.end();
  });
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

/** Insère un message directement (le chat passe normalement par Socket.io). */
export async function insertMessage(matchId: string, senderId: string, content: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    'INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id',
    [matchId, senderId, content],
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
 *  - Hugo a des photos sur son profil.
 */
export async function buildScenario() {
  const hugo = await signup('homme', 'Hugo');
  const lea = await signup('femme_trans', 'Lea');
  const sara = await signup('femme_trans', 'Sara');
  const nina = await signup('femme_trans', 'Nina');

  await api()
    .put('/api/profiles/me')
    .set(auth(hugo))
    .send({ bio: 'Bonjour', photos: ['https://cdn.test/hugo-1.jpg', 'https://cdn.test/hugo-2.jpg'] })
    .expect(200);

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
