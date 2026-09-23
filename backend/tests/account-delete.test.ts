import { describe, expect, it } from 'vitest';
import { api, auth, buildScenario, count, setupTestDb } from './helpers';

setupTestDb();

describe('DELETE /api/account/delete', () => {
  it('exige l’e-mail et le mot de passe du compte', async () => {
    const { hugo } = await buildScenario();

    await api().delete('/api/account/delete').set(auth(hugo)).send({}).expect(400);
    await api()
      .delete('/api/account/delete')
      .set(auth(hugo))
      .send({ email: 'autre@test.fr', password: hugo.password })
      .expect(400);
    await api()
      .delete('/api/account/delete')
      .set(auth(hugo))
      .send({ email: hugo.email, password: 'mauvais-mot-de-passe' })
      .expect(401);
    await api().delete('/api/account/delete').send({ email: hugo.email, password: hugo.password }).expect(401);

    expect(await count('users', 'id = $1', hugo.id)).toBe(1);
  });

  it('supprime le compte et toutes ses données (profil, photos, likes, matchs, messages, blocages, signalements)', async () => {
    const { hugo, lea, sara, nina, matchId, hugoMsg, leaMsg } = await buildScenario();

    // État initial : les données de Hugo existent bien.
    expect(await count('profiles_homme', 'user_id = $1', hugo.id)).toBe(1);
    expect(await count('likes', 'liker_id = $1 OR liked_id = $1', hugo.id)).toBe(4);
    expect(await count('messages', 'match_id = $1', matchId)).toBe(2);
    expect(await count('reports', 'reporter_id = $1 OR reported_id = $1', hugo.id)).toBe(2);

    await api()
      .delete('/api/account/delete')
      .set(auth(hugo))
      // Casse et espaces tolérés sur l'e-mail de confirmation.
      .send({ email: `  ${hugo.email.toUpperCase()} `, password: hugo.password })
      .expect(204);

    expect(await count('users', 'id = $1', hugo.id)).toBe(0);
    expect(await count('profiles_homme', 'user_id = $1', hugo.id)).toBe(0); // profil + photos
    expect(await count('likes', 'liker_id = $1 OR liked_id = $1', hugo.id)).toBe(0);
    expect(await count('matches', 'user_a = $1 OR user_b = $1', hugo.id)).toBe(0);
    expect(await count('messages', 'sender_id = $1', hugo.id)).toBe(0);
    expect(await count('messages', 'id = $1', hugoMsg)).toBe(0);
    // La conversation entière disparaît, y compris les messages reçus.
    expect(await count('messages', 'id = $1', leaMsg)).toBe(0);
    expect(await count('blocks', 'blocker_id = $1 OR blocked_id = $1', hugo.id)).toBe(0);
    expect(await count('reports', 'reporter_id = $1 OR reported_id = $1', hugo.id)).toBe(0);

    // Aucune trace de ses photos ni de son e-mail nulle part.
    for (const needle of ['hugo-1.jpg', hugo.email]) {
      const { rows } = await (await import('./helpers')).pool.query(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE email = $1 OR ip_logs::text LIKE '%' || $1 || '%')
         + (SELECT COUNT(*) FROM profiles_homme WHERE array_to_string(photos, ',') LIKE '%' || $1 || '%')
         + (SELECT COUNT(*) FROM profiles_femme_trans WHERE array_to_string(photos, ',') LIKE '%' || $1 || '%')
         AS n`,
        [needle],
      );
      expect(Number(rows[0].n)).toBe(0);
    }

    // Les autres membres sont intacts.
    for (const other of [lea, sara, nina]) {
      expect(await count('users', 'id = $1', other.id)).toBe(1);
      expect(await count('profiles_femme_trans', 'user_id = $1', other.id)).toBe(1);
    }

    // Le jeton ne fonctionne plus et on ne peut plus se connecter.
    await api().get('/api/account').set(auth(hugo)).expect(401);
    await api().post('/api/auth/login').send({ email: hugo.email, password: hugo.password }).expect(401);

    // Léa ne voit plus le match.
    const matches = await api().get('/api/likes/matches').set(auth(lea)).expect(200);
    expect(matches.body.matches).toEqual([]);
  });

  it('l’ancienne route DELETE /api/profiles/me n’existe plus', async () => {
    const { hugo } = await buildScenario();
    await api().delete('/api/profiles/me').set(auth(hugo)).expect(404);
    expect(await count('users', 'id = $1', hugo.id)).toBe(1);
  });
});
