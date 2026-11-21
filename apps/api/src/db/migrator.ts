import type { Kysely } from 'kysely';
import { type MigrationResultSet, Migrator, NO_MIGRATIONS } from 'kysely/migration';
import { migrations } from './migrations';
import type { Database } from './types';

export function createMigrator(db: Kysely<Database>) {
  return new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  });
}

function assertOk({ error, results }: MigrationResultSet, label: string) {
  const failed = results?.find((r) => r.status === 'Error');
  if (error || failed) {
    const reason = error instanceof Error ? error.message : String(error ?? '');
    throw new Error(`${label} failed at ${failed?.migrationName ?? '?'}: ${reason}`);
  }
  return results ?? [];
}

export async function migrateToLatest(db: Kysely<Database>) {
  return assertOk(await createMigrator(db).migrateToLatest(), 'Migration');
}

export async function migrateDownOne(db: Kysely<Database>) {
  return assertOk(await createMigrator(db).migrateDown(), 'Rollback');
}

export async function migrateDownAll(db: Kysely<Database>) {
  return assertOk(await createMigrator(db).migrateTo(NO_MIGRATIONS), 'Rollback');
}
