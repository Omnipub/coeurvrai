import { describe, expect, it } from 'vitest';
import { listMigrationFiles, runMigrations } from '../src/db/migrations';

describe('Migrations versionnées', () => {
  it('les fichiers sont numérotés et triés', () => {
    const files = listMigrationFiles();
    expect(files[0]).toBe('0001_initial.sql');
    expect([...files].sort()).toEqual(files);
  });

  it('un second passage n’applique rien (déjà fait par global-setup)', async () => {
    const result = await runMigrations(process.env.DATABASE_URL!, { log: () => undefined });
    expect(result.applied).toEqual([]);
    expect(result.skipped).toBe(listMigrationFiles().length);
  });
});
