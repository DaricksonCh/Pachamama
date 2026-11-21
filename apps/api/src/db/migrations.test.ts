import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from './database';
import { migrateDownAll, migrateToLatest } from './migrator';
import { migrations } from './migrations';

async function tableNames() {
  const { rows } = await sql<{ name: string }>`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name <> 'kysely_migration'
      AND table_name <> 'kysely_migration_lock'`.execute(db);
  return rows.map((r) => r.name).sort();
}

async function columns(table: string) {
  const { rows } = await sql<{ name: string; type: string; nullable: string }>`
    SELECT column_name AS name, column_type AS type, is_nullable AS nullable
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = ${table}`.execute(db);
  return Object.fromEntries(rows.map((r) => [r.name, r]));
}

afterAll(async () => {
  // Deja la BD de tests migrada para los siguientes archivos.
  await migrateToLatest(db);
});

describe('migraciones', () => {
  it('están todas aplicadas y crean las tablas de autenticación', async () => {
    expect(await tableNames()).toEqual(['accounts', 'sessions', 'users', 'verifications']);
  });

  it('siguen la convención: snake_case, utf8mb4 y fechas DATETIME(3)', async () => {
    const users = await columns('users');
    expect(Object.keys(users)).toEqual(
      expect.arrayContaining(['email_verified', 'created_at', 'ban_expires']),
    );
    expect(users.created_at?.type).toBe('datetime(3)');
    expect(users.email?.nullable).toBe('NO');

    const { rows } = await sql<{ collation: string }>`
      SELECT table_collation AS collation FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'users'`.execute(db);
    expect(rows[0]?.collation).toMatch(/^utf8mb4/);
  });

  it('se pueden deshacer todas y volver a aplicar (down + up)', async () => {
    const down = await migrateDownAll(db);
    expect(down).toHaveLength(Object.keys(migrations).length);
    expect(await tableNames()).toEqual([]);

    const up = await migrateToLatest(db);
    expect(up.every((r) => r.status === 'Success')).toBe(true);
    expect(await tableNames()).toEqual(['accounts', 'sessions', 'users', 'verifications']);
  });

  it('borrar un usuario borra en cascada sus sesiones y cuentas', async () => {
    const { rows } = await sql<{ rule: string; table: string }>`
      SELECT delete_rule AS rule, table_name AS \`table\`
      FROM information_schema.referential_constraints
      WHERE constraint_schema = DATABASE()`.execute(db);
    expect(rows.map((r) => `${r.table}:${r.rule}`).sort()).toEqual([
      'accounts:CASCADE',
      'sessions:CASCADE',
    ]);
  });
});
