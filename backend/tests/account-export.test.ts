import { describe, expect, it } from 'vitest';
import { api, auth, buildScenario, setupTestDb } from './helpers';

setupTestDb();

describe('GET /api/account/export', () => {
  it('exige d’être connecté', async () => {
    await api().get('/api/account/export').expect(401);
  });

  it('télécharge un JSON complet des données du membre', async () => {
    const { hugo, lea, sara, nina, matchId } = await buildScenario();

    const res = await api().get('/api/account/export').set(auth(hugo)).expect(200);

    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="coeurvrai-export-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(res.headers['cache-control']).toBe('no-store');

    const data = JSON.parse(res.text);
    expect(data.format).toBe('coeurvrai-export/v1');

    // Compte, sans secret.
    expect(data.account).toMatchObject({ id: hugo.id, email: hugo.email, accountType: 'homme' });
    expect(res.text).not.toMatch(/password|\$2[aby]\$/);

    // Consentements et données de connexion.
    expect(data.consents.termsVersion).toBe(data.consents.currentTermsVersion);
    expect(data.consents.gdprConsentDate).toBeTruthy();
    // IP de l'inscription (X-Forwarded-For), puis celle des requêtes suivantes.
    expect(data.connectionData.ipLogs[0]).toMatchObject({ ip: '203.0.113.10', date: expect.any(String) });
    expect(data.connectionData.lastIp).toBe(data.connectionData.ipLogs.at(-1).ip);
    expect(data.connectionData.lastActivityAt).toBeTruthy();

    // Profil et photos.
    expect(data.profile.photos).toEqual(['https://cdn.test/hugo-1.jpg', 'https://cdn.test/hugo-2.jpg']);

    // Activité.
    expect(data.likesGiven.map((l: { userId: string }) => l.userId).sort()).toEqual([lea.id, sara.id].sort());
    expect(data.likesReceived).toHaveLength(2); // Léa + Nina, sans leur identité
    expect(JSON.stringify(data.likesReceived)).not.toContain(nina.id);
    expect(data.matches).toEqual([expect.objectContaining({ matchId, partnerId: lea.id, unmatchedAt: null })]);
    expect(data.messagesSent).toEqual([expect.objectContaining({ matchId, content: 'Salut Léa' })]);
    expect(JSON.stringify(data.messagesSent)).not.toContain('Salut Hugo');
    // Nina bloquée manuellement, Sara bloquée automatiquement par le signalement.
    expect(data.blocks.map((b: { userId: string }) => b.userId).sort()).toEqual([nina.id, sara.id].sort());
    expect(data.reportsFiled).toEqual([expect.objectContaining({ reportedId: sara.id, reason: 'faux_profil' })]);

    // Signalement reçu : motif et statut, sans l'identité de la personne qui signale.
    expect(data.reportsReceived).toEqual([expect.objectContaining({ reason: 'harcelement', status: 'pending' })]);
    expect(JSON.stringify(data.reportsReceived)).not.toContain(lea.id);
  });
});
