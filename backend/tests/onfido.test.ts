import { beforeEach, describe, expect, it } from 'vitest';
import { setOnfidoClient } from '../src/services/onfido';
import { api, auth, lastVerificationToken, pool, setupTestDb, signup, TestUser } from './helpers';
import { FakeOnfido, signedWebhook } from './onfido-fake';

setupTestDb();

let onfido: FakeOnfido;
beforeEach(() => {
  onfido = new FakeOnfido();
  setOnfidoClient(onfido);
});

const startCheck = (user: TestUser) =>
  api().post('/api/verification/onfido-token').set(auth(user)).send({ consent: true });

const sendWebhook = (runId: string, status: Parameters<typeof signedWebhook>[1], token?: string) => {
  const { body, signature } = signedWebhook(runId, status, token);
  return api()
    .post('/api/verification/onfido-check')
    .set('Content-Type', 'application/json')
    .set('X-SHA2-Signature', signature)
    .send(body);
};

async function verifyEmail(user: TestUser) {
  await api().post('/api/auth/verify-email').send({ token: lastVerificationToken(user.email) }).expect(200);
}

async function status(user: TestUser) {
  return (await api().get('/api/verification/status').set(auth(user)).expect(200)).body;
}

describe('POST /api/verification/onfido-token', () => {
  it('exige le consentement explicite', async () => {
    const user = await signup('homme', 'Sans');
    await api().post('/api/verification/onfido-token').set(auth(user)).send({}).expect(400);
    expect(onfido.applicants.size).toBe(0);
  });

  it('renvoie 503 si Onfido n’est pas configuré', async () => {
    setOnfidoClient(null);
    const user = await signup('homme', 'Off');
    await startCheck(user).expect(503);
    expect((await status(user)).onfidoAvailable).toBe(false);
  });

  it('crée l’applicant une seule fois et un workflow run à chaque tentative', async () => {
    const user = await signup('femme_trans', 'Selfie');

    const first = await startCheck(user).expect(201);
    expect(first.body).toEqual({ sdkToken: expect.stringMatching(/^sdk_token_for_/), workflowRunId: expect.any(String) });

    const { rows } = await pool.query(
      'SELECT onfido_applicant_id, onfido_check_id, onfido_check_status, onfido_consent_at FROM users WHERE id = $1',
      [user.id],
    );
    expect(rows[0]).toMatchObject({
      onfido_applicant_id: 'applicant_1',
      onfido_check_id: first.body.workflowRunId,
      onfido_check_status: 'awaiting_input',
    });
    expect(rows[0].onfido_consent_at).toBeTruthy();

    // L'utilisateur quitte le SDK puis recommence : même applicant, nouveau run.
    const second = await startCheck(user).expect(201);
    expect(second.body.workflowRunId).not.toBe(first.body.workflowRunId);
    expect(onfido.applicants.size).toBe(1);
  });

  it('refuse une nouvelle vérification une fois approuvée', async () => {
    const user = await signup('homme', 'Deja');
    const { body } = await startCheck(user).expect(201);
    onfido.complete(body.workflowRunId, 'approved');
    await sendWebhook(body.workflowRunId, 'approved').expect(200);
    await startCheck(user).expect(409);
  });
});

describe('POST /api/verification/onfido-check (webhook)', () => {
  it('rejette une signature absente ou invalide', async () => {
    const user = await signup('homme', 'Pirate');
    const { body } = await startCheck(user).expect(201);
    onfido.complete(body.workflowRunId, 'approved');

    await api().post('/api/verification/onfido-check').send({ payload: {} }).expect(401);
    await sendWebhook(body.workflowRunId, 'approved', 'mauvais-secret').expect(401);

    // Corps modifié après signature.
    const { signature } = signedWebhook(body.workflowRunId, 'declined');
    await api()
      .post('/api/verification/onfido-check')
      .set('Content-Type', 'application/json')
      .set('X-SHA2-Signature', signature)
      .send(signedWebhook(body.workflowRunId, 'approved').body)
      .expect(401);

    expect((await status(user)).onfidoStatus).toBe('awaiting_input');
  });

  it('vérification réussie : statut approved', async () => {
    const user = await signup('femme_trans', 'Ok');
    const { body } = await startCheck(user).expect(201);

    onfido.complete(body.workflowRunId, 'approved');
    const res = await sendWebhook(body.workflowRunId, 'approved').expect(200);
    expect(res.body).toEqual({ received: true, updated: true });

    const s = await status(user);
    expect(s.onfidoStatus).toBe('approved');
    expect(s.onfidoCheckedAt).toBeTruthy();
    // E-mail pas encore vérifié : pas de badge.
    expect(s.verifiedBadge).toBe(false);
  });

  it('vérification échouée : statut declined, pas de badge, nouvelle tentative possible', async () => {
    const user = await signup('homme', 'Refus');
    await verifyEmail(user);
    const { body } = await startCheck(user).expect(201);

    onfido.complete(body.workflowRunId, 'declined');
    await sendWebhook(body.workflowRunId, 'declined').expect(200);

    const s = await status(user);
    expect(s).toMatchObject({ emailVerified: true, onfidoStatus: 'declined', verifiedBadge: false });
    await startCheck(user).expect(201);
  });

  it('le statut fait foi côté API Onfido, pas dans le corps du webhook', async () => {
    const user = await signup('homme', 'Malin');
    const { body } = await startCheck(user).expect(201);
    onfido.complete(body.workflowRunId, 'declined');

    // Webhook correctement signé annonçant « approved » : l'API Onfido dit « declined ».
    await sendWebhook(body.workflowRunId, 'approved').expect(200);
    expect((await status(user)).onfidoStatus).toBe('declined');
  });

  it('ignore les runs inconnus et les autres types d’événements', async () => {
    const res = await sendWebhook('run_inconnu', 'approved').expect(200);
    expect(res.body).toEqual({ received: true, ignored: true });
  });
});

describe('Parcours complet : inscription → e-mail → Onfido → badge', () => {
  it('le badge « Profil vérifié » n’apparaît qu’avec e-mail vérifié ET Onfido approuvé', async () => {
    const lea = await signup('femme_trans', 'Lea');
    const hugo = await signup('homme', 'Hugo');

    const leaSeenByHugo = async () => {
      const res = await api().get('/api/profiles/discover').set(auth(hugo)).expect(200);
      return res.body.profiles.find((p: { id: string }) => p.id === lea.id);
    };

    expect((await leaSeenByHugo()).verified).toBe(false);

    // 1. E-mail vérifié seul : pas de badge.
    await verifyEmail(lea);
    expect((await status(lea)).verifiedBadge).toBe(false);
    expect((await leaSeenByHugo()).verified).toBe(false);

    // 2. Onfido approuvé : badge.
    const { body } = await startCheck(lea).expect(201);
    onfido.complete(body.workflowRunId, 'approved');
    await sendWebhook(body.workflowRunId, 'approved').expect(200);

    expect(await status(lea)).toMatchObject({ emailVerified: true, onfidoStatus: 'approved', verifiedBadge: true });
    expect((await leaSeenByHugo()).verified).toBe(true);
    const me = await api().get('/api/auth/me').set(auth(lea)).expect(200);
    expect(me.body.user.verified).toBe(true);

    // Visible aussi dans la liste des matchs et sur le profil.
    await api().post(`/api/likes/${lea.id}`).set(auth(hugo)).expect(201);
    await api().post(`/api/likes/${hugo.id}`).set(auth(lea)).expect(201);
    const matches = await api().get('/api/likes/matches').set(auth(hugo)).expect(200);
    expect(matches.body.matches[0].user.verified).toBe(true);
    const profile = await api().get(`/api/profiles/${lea.id}`).set(auth(hugo)).expect(200);
    expect(profile.body.profile.verified).toBe(true);

    // L'export RGPD contient la vérification, jamais le jeton.
    const exp = await api().get('/api/account/export').set(auth(lea)).expect(200);
    expect(JSON.parse(exp.text).verification).toMatchObject({ emailVerified: true, onfidoCheckStatus: 'approved', verifiedBadge: true });
    expect(exp.text).not.toMatch(/token_hash/);
  });

  it('la suppression du compte supprime aussi l’applicant chez Onfido', async () => {
    const user = await signup('homme', 'Efface');
    await startCheck(user).expect(201);
    await api()
      .delete('/api/account/delete')
      .set(auth(user))
      .send({ email: user.email, password: user.password })
      .expect(204);
    expect(onfido.deletedApplicants).toEqual(['applicant_1']);
  });
});
