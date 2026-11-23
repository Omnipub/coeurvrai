import { describe, expect, it, vi } from 'vitest';
import { logger, pseudonym, safeError, safePath } from '../src/utils/logger';
import { api, setupTestDb, signup } from './helpers';

setupTestDb();

describe('Journaux sans données personnelles', () => {
  it('masque les identifiants et retire la query string', () => {
    expect(safePath('/api/profiles/2aadbb77-4113-47d7-9f90-26a0c514b46f?email=a@b.fr&token=x')).toBe('/api/profiles/:id');
  });

  it('pseudonymise les membres de façon stable et non réversible', () => {
    const id = '2aadbb77-4113-47d7-9f90-26a0c514b46f';
    expect(pseudonym(id)).toBe(pseudonym(id));
    expect(pseudonym(id)).toHaveLength(12);
    expect(pseudonym(id)).not.toContain('2aadbb77');
  });

  it('écarte le détail des erreurs PostgreSQL (qui peut contenir un e-mail)', () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), {
      code: '23505',
      detail: 'Key (email)=(secret@exemple.fr) already exists.',
    });
    const safe = JSON.stringify(safeError(err));
    expect(safe).toContain('23505');
    expect(safe).not.toContain('secret@exemple.fr');
  });

  it('une inscription et une connexion ne journalisent ni e-mail, ni mot de passe, ni IP', async () => {
    process.env.LOG_IN_TESTS = '1';
    const lines: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      const user = await signup('homme', 'Journal', '198.51.100.42');
      await api()
        .post('/api/auth/login')
        .set('X-Forwarded-For', '198.51.100.42')
        .send({ email: user.email, password: user.password })
        .expect(200);
      logger.info('test.fin');
    } finally {
      spy.mockRestore();
      delete process.env.LOG_IN_TESTS;
    }
    const all = lines.join('');
    expect(all).toContain('"path":"/api/auth/login"');
    expect(all).not.toMatch(/journal\d+@test\.fr|motdepasse123|198\.51\.100\.42|cv_session/);
  });
});
