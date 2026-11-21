import { sql } from 'kysely';
import { applyTestEnv, assertTestDatabaseName } from './test-env';

/**
 * Una vez por ejecución: deja la BD de tests vacía y con todas las migraciones aplicadas.
 * Así cada ejecución empieza de cero y se prueba también que las migraciones se aplican.
 */
export default async function globalSetup() {
  applyTestEnv();
  const { createDatabase } = await import('../db/database');
  const { migrateToLatest } = await import('../db/migrator');
  const db = createDatabase(process.env.DATABASE_URL);

  try {
    // Segunda barrera antes de borrar nada: la conexión real apunta a una base *_test.
    const { rows: current } = await sql<{ name: string | null }>`SELECT DATABASE() AS name`.execute(
      db,
    );
    assertTestDatabaseName(current[0]?.name);

    const { rows } = await sql<{ name: string }>`
      SELECT table_name AS name FROM information_schema.tables
      WHERE table_schema = DATABASE()`.execute(db);

    await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(db);
    for (const { name } of rows) {
      await sql`DROP TABLE ${sql.table(name)}`.execute(db);
    }
    await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(db);

    await migrateToLatest(db);
  } finally {
    await db.destroy();
  }
}
