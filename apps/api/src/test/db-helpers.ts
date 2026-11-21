import { sql } from 'kysely';
import { db } from '../db/database';
import { assertTestDatabaseName } from './test-env';

/** Comprueba en la propia conexión que estamos en una BD de tests (segunda barrera). */
export async function assertConnectedToTestDatabase(conn = db) {
  const { rows } = await sql<{ name: string | null }>`SELECT DATABASE() AS name`.execute(conn);
  assertTestDatabaseName(rows[0]?.name);
}

/** Vacía las tablas de autenticación (orden respetando claves foráneas). Solo BD de tests. */
export async function resetAuthTables() {
  await assertConnectedToTestDatabase();
  await db.deleteFrom('sessions').execute();
  await db.deleteFrom('accounts').execute();
  await db.deleteFrom('verifications').execute();
  await db.deleteFrom('users').execute();
}

let ipCounter = 0;

/** IP distinta por petición/test para que el rate-limit de un test no afecte a otro. */
export function uniqueIp() {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}
