import { describe, expect, it } from 'vitest';
import { api, auth, SITE_ORIGIN, setupTestDb, signup } from './helpers';

setupTestDb();

describe('Session par cookie', () => {
  it('le cookie est HttpOnly, SameSite=Strict, et le jeton n’est jamais renvoyé dans le corps', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({
        email: 'cookie@test.fr',
        password: 'motdepasse123',
        accountType: 'homme',
        birthdate: '1990-01-01',
        displayName: 'Cookie',
        acceptTerms: true,
        gdprConsent: true,
      })
      .expect(201);
    const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0];
    expect(cookie).toMatch(/^cv_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//);
    expect(res.body.token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/); // aucun JWT dans le corps
  });

  it('un jeton dans l’en-tête Authorization n’est plus accepté', async () => {
    const user = await signup('homme', 'Bearer');
    const jwt = user.token.split('=')[1];
    await api().get('/api/auth/me').set('Authorization', `Bearer ${jwt}`).expect(401);
    await api().get('/api/auth/me').set(auth(user)).expect(200);
  });

  it('la déconnexion efface le cookie', async () => {
    const user = await signup('homme', 'Sortie');
    const res = await api().post('/api/auth/logout').set(auth(user)).expect(204);
    expect(([] as string[]).concat(res.headers['set-cookie'] ?? [])[0]).toMatch(/cv_session=;.*Expires=Thu, 01 Jan 1970/);
  });
});

describe('Protection CSRF', () => {
  it('refuse une requête qui modifie des données depuis un autre site', async () => {
    const user = await signup('homme', 'Csrf');
    await api()
      .put('/api/profiles/me')
      .set('Cookie', user.token)
      .set('Origin', 'https://site-malveillant.example')
      .send({ bio: 'piraté' })
      .expect(403);
    // Sans Origin ni Referer, avec cookie : refusé aussi.
    await api().put('/api/profiles/me').set('Cookie', user.token).send({ bio: 'piraté' }).expect(403);
    // Referer du site : accepté.
    await api()
      .put('/api/profiles/me')
      .set('Cookie', user.token)
      .set('Referer', `${SITE_ORIGIN}/settings`)
      .send({ bio: 'ok' })
      .expect(200);
    // Lecture : pas de contrôle d'origine.
    await api().get('/api/profiles/me').set('Cookie', user.token).expect(200);
  });
});
