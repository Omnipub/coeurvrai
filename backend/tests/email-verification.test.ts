import { describe, expect, it } from 'vitest';
import { api, auth, lastVerificationToken, outbox, pool, setupTestDb, signup } from './helpers';

setupTestDb();

async function emailState(id: string) {
  const { rows } = await pool.query(
    `SELECT email_verified, email_verified_at, email_verification_token_hash, email_verification_expires_at
       FROM users WHERE id = $1`,
    [id],
  );
  return rows[0];
}

describe('Vérification de l’adresse e-mail', () => {
  it('envoie un lien valable 24 h à l’inscription (jeton stocké haché)', async () => {
    const user = await signup('homme', 'Mail');

    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe(user.email);
    expect(outbox[0].subject).toMatch(/Confirmez votre adresse/);
    expect(outbox[0].text).toContain('https://app.test/verify-email?token=');
    expect(outbox[0].html).toContain('https://app.test/verify-email?token=');

    const token = lastVerificationToken(user.email);
    const state = await emailState(user.id);
    expect(state.email_verified).toBe(false);
    expect(state.email_verification_token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(state.email_verification_token_hash).not.toBe(token);
    const ttlHours = (new Date(state.email_verification_expires_at).getTime() - Date.now()) / 3_600_000;
    expect(ttlHours).toBeGreaterThan(23.9);
    expect(ttlHours).toBeLessThanOrEqual(24);

    const me = await api().get('/api/auth/me').set(auth(user)).expect(200);
    expect(me.body.user).toMatchObject({ emailVerified: false, verified: false });
  });

  it('POST /api/auth/verify-email valide l’adresse, une seule fois', async () => {
    const user = await signup('femme_trans', 'Valide');
    const token = lastVerificationToken(user.email);

    await api().post('/api/auth/verify-email').send({ token }).expect(200, { verified: true });

    const state = await emailState(user.id);
    expect(state.email_verified).toBe(true);
    expect(state.email_verified_at).toBeTruthy();
    expect(state.email_verification_token_hash).toBeNull();

    // Lien à usage unique.
    await api().post('/api/auth/verify-email').send({ token }).expect(400);

    const me = await api().get('/api/auth/me').set(auth(user)).expect(200);
    expect(me.body.user.emailVerified).toBe(true);
  });

  it('refuse un lien invalide ou expiré', async () => {
    const user = await signup('homme', 'Expire');
    const token = lastVerificationToken(user.email);

    await api().post('/api/auth/verify-email').send({}).expect(400);
    await api().post('/api/auth/verify-email').send({ token: 'x'.repeat(43) }).expect(400);

    await pool.query(
      `UPDATE users SET email_verification_expires_at = now() - interval '1 minute' WHERE id = $1`,
      [user.id],
    );
    const res = await api().post('/api/auth/verify-email').send({ token }).expect(400);
    expect(res.body.error).toMatch(/invalide ou expiré/);
    expect((await emailState(user.id)).email_verified).toBe(false);
  });

  it('le renvoi génère un nouveau lien et invalide l’ancien', async () => {
    const user = await signup('homme', 'Renvoi');
    const first = lastVerificationToken(user.email);

    await api().post('/api/auth/send-verification-email').expect(401);
    await api().post('/api/auth/send-verification-email').set(auth(user)).expect(202);
    expect(outbox).toHaveLength(2);
    const second = lastVerificationToken(user.email);
    expect(second).not.toBe(first);

    await api().post('/api/auth/verify-email').send({ token: first }).expect(400);
    await api().post('/api/auth/verify-email').send({ token: second }).expect(200);

    // Déjà vérifiée : plus d'envoi.
    await api().post('/api/auth/send-verification-email').set(auth(user)).expect(409);
    expect(outbox).toHaveLength(2);
  });

  it('limite les renvois à 3 par heure', async () => {
    const user = await signup('homme', 'Spam');
    for (let i = 0; i < 3; i++) {
      await api().post('/api/auth/send-verification-email').set(auth(user)).expect(202);
    }
    await api().post('/api/auth/send-verification-email').set(auth(user)).expect(429);
  });
});
