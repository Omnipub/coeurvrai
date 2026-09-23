import { describe, expect, it } from 'vitest';
import { TERMS_VERSION } from '../src/models/types';
import { api, auth, pool, setupTestDb, signup, waitFor } from './helpers';

setupTestDb();

async function userRow(id: string) {
  const { rows } = await pool.query('SELECT last_ip, last_activity_at, ip_logs FROM users WHERE id = $1', [id]);
  return rows[0];
}

describe('Journalisation des IP de connexion', () => {
  it('enregistre l’IP et la date à l’inscription et à chaque connexion', async () => {
    const user = await signup('homme', 'Log', '203.0.113.1');
    let row = await userRow(user.id);
    expect(row.last_ip).toBe('203.0.113.1');
    expect(row.ip_logs).toEqual([{ ip: '203.0.113.1', date: expect.any(String) }]);

    await api()
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.1')
      .send({ email: user.email, password: user.password })
      .expect(200);
    row = await userRow(user.id);
    expect(row.ip_logs).toHaveLength(2); // chaque connexion est tracée, même IP
  });

  it('ajoute une entrée quand l’IP change pendant une session, sans doublon sinon', async () => {
    const user = await signup('homme', 'Mobile', '203.0.113.1');

    await api().get('/api/profiles/me').set(auth(user)).set('X-Forwarded-For', '203.0.113.1').expect(200);
    await new Promise((r) => setTimeout(r, 100));
    expect((await userRow(user.id)).ip_logs).toHaveLength(1);

    await api().get('/api/profiles/me').set(auth(user)).set('X-Forwarded-For', '198.51.100.7').expect(200);
    await waitFor(async () => (await userRow(user.id)).last_ip === '198.51.100.7');
    const row = await userRow(user.id);
    expect(row.ip_logs.map((e: { ip: string }) => e.ip)).toEqual(['203.0.113.1', '198.51.100.7']);
  });

  it('met à jour la dernière activité (au plus toutes les 5 minutes)', async () => {
    const user = await signup('homme', 'Actif');
    await pool.query(`UPDATE users SET last_activity_at = now() - interval '1 hour' WHERE id = $1`, [user.id]);

    await api().get('/api/profiles/me').set(auth(user)).set('X-Forwarded-For', '203.0.113.10').expect(200);
    await waitFor(async () => Date.now() - new Date((await userRow(user.id)).last_activity_at).getTime() < 60_000);
  });

  it('supprime au passage les entrées de plus d’un an', async () => {
    const user = await signup('homme', 'Vieux', '203.0.113.1');
    await pool.query(
      `UPDATE users SET ip_logs = jsonb_build_array(
         jsonb_build_object('ip', '192.0.2.1', 'date', now() - interval '2 years')) WHERE id = $1`,
      [user.id],
    );
    await api()
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.2')
      .send({ email: user.email, password: user.password })
      .expect(200);
    expect((await userRow(user.id)).ip_logs.map((e: { ip: string }) => e.ip)).toEqual(['203.0.113.2']);
  });

  it('GET /api/account renvoie la dernière activité et l’historique des IP (plus récent d’abord)', async () => {
    const user = await signup('homme', 'Histo', '203.0.113.1');
    await api()
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.2')
      .send({ email: user.email, password: user.password })
      .expect(200);

    const res = await api().get('/api/account').set(auth(user)).set('X-Forwarded-For', '203.0.113.2').expect(200);
    expect(res.body.lastIp).toBe('203.0.113.2');
    expect(res.body.lastActivityAt).toBeTruthy();
    expect(res.body.ipLogs.map((e: { ip: string }) => e.ip)).toEqual(['203.0.113.2', '203.0.113.1']);
    expect(res.body.consents).toMatchObject({ currentVersion: TERMS_VERSION, upToDate: true });
  });
});

describe('Version des textes', () => {
  it('GET /api/account/consent-version est public', async () => {
    const res = await api().get('/api/account/consent-version').expect(200);
    expect(res.body).toEqual({ version: TERMS_VERSION });
  });

  it('POST /api/account/consent enregistre l’acceptation de la version en vigueur', async () => {
    const user = await signup('homme', 'Consent');
    await pool.query(`UPDATE users SET terms_version = '2020-01-01' WHERE id = $1`, [user.id]);
    let res = await api().get('/api/account').set(auth(user)).expect(200);
    expect(res.body.consents.upToDate).toBe(false);

    await api().post('/api/account/consent').set(auth(user)).send({ acceptTerms: true }).expect(400);
    await api().post('/api/account/consent').set(auth(user)).send({ acceptTerms: true, gdprConsent: true }).expect(200);

    res = await api().get('/api/account').set(auth(user)).expect(200);
    expect(res.body.consents).toMatchObject({ termsVersion: TERMS_VERSION, upToDate: true });
  });
});

describe('Non-indexation de l’API', () => {
  it('chaque réponse porte X-Robots-Tag noindex et robots.txt interdit tout', async () => {
    const res = await api().get('/api/account/consent-version').expect(200);
    expect(res.headers['x-robots-tag']).toMatch(/noindex/);
    const robots = await api().get('/robots.txt').expect(200);
    expect(robots.text).toContain('Disallow: /');
  });
});
