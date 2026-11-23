/**
 * Prepara la BD de tests para los e2e de Playwright: migraciones + usuarios de prueba.
 * Solo funciona contra una base que termine en `_test` (nunca la real).
 * Credenciales de prueba: las define apps/web/e2e/fixtures.ts y llegan por variables de entorno.
 */
import { applyTestEnv } from '../src/test/test-env';

applyTestEnv();

const { auth } = await import('../src/auth/auth');
const { createStaffUser } = await import('../src/auth/create-staff-user');
const { db } = await import('../src/db/database');
const { migrateToLatest } = await import('../src/db/migrator');
const { resetAuthTables, resetMenuTables, resetReservationConfig, resetReservationTables } =
  await import('../src/test/db-helpers');

const users = [
  { prefix: 'E2E_ADMIN', role: 'admin' as const },
  { prefix: 'E2E_STAFF', role: 'staff' as const },
];

try {
  await migrateToLatest(db);
  await resetAuthTables();
  await resetMenuTables();
  await resetReservationTables();
  await resetReservationConfig();
  for (const { prefix, role } of users) {
    const email = process.env[`${prefix}_EMAIL`];
    const password = process.env[`${prefix}_PASSWORD`];
    const name = process.env[`${prefix}_NAME`];
    if (!email || !password || !name) throw new Error(`Faltan las variables ${prefix}_*`);
    await createStaffUser(auth, { email, password, name, role });
  }
  console.log('✔ BD de e2e preparada');
} catch (err) {
  console.error('✖', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
