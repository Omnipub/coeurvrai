import { describe, expect, it } from 'vitest';
import { purgeClosedReports, purgeInactiveAccounts, purgeOldIpLogs, runCleanup } from '../src/jobs/cleanup';
import { api, auth, buildScenario, count, pool, setupTestDb, signup } from './helpers';

setupTestDb();

/** Antidate des colonnes d'un utilisateur (simulation du passage du temps). */
async function setUser(id: string, fields: Record<string, string | null>) {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = ${fields[k] === null ? 'NULL' : `now() - $${i + 2}::interval`}`);
  const values = keys.map((k) => fields[k]).filter((v) => v !== null);
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1`, [id, ...values]);
}

describe('Job : comptes inactifs depuis 2 ans', () => {
  it('prévient d’abord (à 23 mois), puis supprime après 30 jours de préavis', async () => {
    const active = await signup('homme', 'Actif');
    const almost = await signup('homme', 'Presque'); // 22 mois : rien
    const dormant = await signup('femme_trans', 'Dormante'); // 25 mois, pas encore prévenue
    const warned = await signup('homme', 'Prevenu'); // 25 mois, prévenu il y a 31 jours

    await setUser(almost.id, { last_activity_at: '22 months' });
    await setUser(dormant.id, { last_activity_at: '25 months' });
    await setUser(warned.id, { last_activity_at: '25 months', inactivity_warned_at: '31 days' });

    const first = await purgeInactiveAccounts();
    expect(first).toEqual({ warned: 1, deleted: 1 });
    expect(await count('users', 'id = $1', warned.id)).toBe(0);
    expect(await count('users', 'id = $1 AND inactivity_warned_at IS NOT NULL', dormant.id)).toBe(1);
    expect(await count('users', 'id = $1 AND inactivity_warned_at IS NULL', almost.id)).toBe(1);
    expect(await count('users', 'id = $1', active.id)).toBe(1);

    // Pas de suppression tant que le préavis n'a pas 30 jours.
    expect(await purgeInactiveAccounts()).toEqual({ warned: 0, deleted: 0 });

    await setUser(dormant.id, { inactivity_warned_at: '30 days 1 hour' });
    expect(await purgeInactiveAccounts()).toEqual({ warned: 0, deleted: 1 });
    expect(await count('users', 'id = $1', dormant.id)).toBe(0);
    expect(await count('profiles_femme_trans', 'user_id = $1', dormant.id)).toBe(0);
  });

  it('supprime aussi les données liées (likes, matchs, messages)', async () => {
    const { hugo, matchId } = await buildScenario();
    await setUser(hugo.id, { last_activity_at: '3 years', inactivity_warned_at: '40 days' });

    await purgeInactiveAccounts();

    expect(await count('users', 'id = $1', hugo.id)).toBe(0);
    expect(await count('likes', 'liker_id = $1 OR liked_id = $1', hugo.id)).toBe(0);
    expect(await count('matches', 'id = $1', matchId)).toBe(0);
    expect(await count('messages', 'match_id = $1', matchId)).toBe(0);
  });

  it('un retour sur le site annule le préavis', async () => {
    const user = await signup('homme', 'Revenant');
    await setUser(user.id, { last_activity_at: '25 months', inactivity_warned_at: '10 days' });

    await api().get('/api/account').set(auth(user)).expect(200);
    await new Promise((r) => setTimeout(r, 100)); // journalisation asynchrone

    expect(await count('users', `id = $1 AND inactivity_warned_at IS NULL
                                 AND last_activity_at > now() - interval '1 minute'`, user.id)).toBe(1);
    await setUser(user.id, { inactivity_warned_at: null });
    expect(await purgeInactiveAccounts()).toEqual({ warned: 0, deleted: 0 });
  });
});

describe('Job : signalements clos depuis 1 an', () => {
  it('ne supprime que les signalements clos depuis plus d’un an', async () => {
    const a = await signup('homme', 'Alex');
    const b = await signup('femme_trans', 'Bea');
    const insert = (status: string, closedAgo: string | null) =>
      pool
        .query<{ id: string }>(
          `INSERT INTO reports (reporter_id, reported_id, reason, status, created_at, closed_at)
           VALUES ($1, $2, 'autre', $3, now() - interval '2 years',
                   CASE WHEN $4::interval IS NULL THEN NULL ELSE now() - $4::interval END)
           RETURNING id`,
          [a.id, b.id, status, closedAgo],
        )
        .then((r) => r.rows[0].id);

    const oldResolved = await insert('resolved', '13 months');
    const oldDismissed = await insert('dismissed', '400 days');
    const recentResolved = await insert('resolved', '11 months');
    const oldPending = await insert('pending', null); // jamais clos : conservé
    const oldReviewing = await insert('reviewing', null);

    expect(await purgeClosedReports()).toBe(2);
    expect(await count('reports', 'id = $1', oldResolved)).toBe(0);
    expect(await count('reports', 'id = $1', oldDismissed)).toBe(0);
    for (const id of [recentResolved, oldPending, oldReviewing]) {
      expect(await count('reports', 'id = $1', id)).toBe(1);
    }
  });

  it('la résolution par un·e modérateur·rice renseigne closed_at', async () => {
    const mod = await signup('homme', 'Modo');
    const victim = await signup('femme_trans', 'Victime');
    const target = await signup('homme', 'Cible');
    await pool.query(`UPDATE users SET role = 'moderator' WHERE id = $1`, [mod.id]);
    const report = await api()
      .post('/api/reports')
      .set(auth(victim))
      .send({ reportedId: target.id, reason: 'harcelement' })
      .expect(201);

    await api().post('/api/moderation/next').set(auth(mod)).expect(200);
    const res = await api()
      .post(`/api/moderation/${report.body.id}/resolve`)
      .set(auth(mod))
      .send({ action: 'dismiss' })
      .expect(200);
    expect(res.body.report.closed_at).toBeTruthy();
    expect(res.body.report.status).toBe('dismissed');
  });
});

describe('Job : données de connexion de plus d’1 an', () => {
  it('retire les IP de plus d’un an et conserve les récentes', async () => {
    const user = await signup('homme', 'Ip');
    await pool.query(
      `UPDATE users
          SET ip_logs = jsonb_build_array(
                jsonb_build_object('ip', '198.51.100.1', 'date', now() - interval '14 months'),
                jsonb_build_object('ip', '198.51.100.2', 'date', now() - interval '366 days'),
                jsonb_build_object('ip', '198.51.100.3', 'date', now() - interval '2 months')),
              last_ip = '198.51.100.3'
        WHERE id = $1`,
      [user.id],
    );
    const stale = await signup('femme_trans', 'Ancienne');
    await pool.query(
      `UPDATE users SET last_activity_at = now() - interval '13 months', last_ip = '198.51.100.9',
                        ip_logs = jsonb_build_array(jsonb_build_object('ip', '198.51.100.9', 'date', now() - interval '13 months'))
        WHERE id = $1`,
      [stale.id],
    );

    expect(await purgeOldIpLogs()).toBe(2);

    const { rows } = await pool.query(`SELECT id, last_ip, ip_logs FROM users WHERE id = ANY($1)`, [[user.id, stale.id]]);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId[user.id].ip_logs.map((e: { ip: string }) => e.ip)).toEqual(['198.51.100.3']);
    expect(byId[user.id].last_ip).toBe('198.51.100.3');
    expect(byId[stale.id].ip_logs).toEqual([]);
    expect(byId[stale.id].last_ip).toBeNull();

    // Idempotent.
    expect(await purgeOldIpLogs()).toBe(0);
  });
});

describe('runCleanup', () => {
  it('exécute toutes les purges et refuse une exécution concurrente', async () => {
    const [first, second] = await Promise.all([runCleanup(), runCleanup()]);
    const results = [first, second];
    expect(results.filter((r) => r === null)).toHaveLength(1);
    expect(results.find((r) => r !== null)).toEqual({
      inactivityWarned: 0,
      inactiveAccountsDeleted: 0,
      closedReportsDeleted: 0,
      ipLogsPruned: 0,
    });
  });
});
