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

/** Vacía carta (platos primero por la FK RESTRICT). Solo BD de tests. */
export async function resetMenuTables() {
  await assertConnectedToTestDatabase();
  await db.deleteFrom('dishes').execute();
  await db.deleteFrom('menuCategories').execute();
}

/** Vacía reservas e historial (no las tablas de configuración sembradas). Solo BD de tests. */
export async function resetReservationTables() {
  await assertConnectedToTestDatabase();
  await db.deleteFrom('reservationEvents').execute();
  await db.deleteFrom('reservations').execute();
}

/**
 * Deja la configuración de reservas en sus valores sembrados por la migración: horario martes a
 * domingo 13:00-22:00, ajustes por defecto y sin cierres. Las plantillas no se tocan (solo se
 * comprueba que siguen las 8). Solo BD de tests.
 */
export async function resetReservationConfig() {
  await assertConnectedToTestDatabase();
  await db.deleteFrom('closures').execute();
  await db.deleteFrom('openingHours').execute();
  await sql`INSERT INTO opening_hours (weekday, opens, closes) VALUES
    (2,'13:00:00','22:00:00'),(3,'13:00:00','22:00:00'),(4,'13:00:00','22:00:00'),
    (5,'13:00:00','22:00:00'),(6,'13:00:00','22:00:00'),(0,'13:00:00','22:00:00')`.execute(db);
  await sql`UPDATE reservation_settings SET slot_minutes = 30, last_slot_before_close_minutes = 60,
    party_min = 1, party_max = 10, capacity_per_slot = 30, min_lead_minutes = 120,
    max_advance_days = 60, same_day_online = 0, hours_confirmed = 0 WHERE id = 1`.execute(db);
  const { rows } = await sql<{
    n: number;
  }>`SELECT COUNT(*) AS n FROM reservation_message_templates`.execute(db);
  if (Number(rows[0]?.n) !== 8)
    throw new Error('Faltan plantillas de mensajes: recrea la BD de tests');
}

let ipCounter = 0;

/** IP distinta por petición/test para que el rate-limit de un test no afecte a otro. */
export function uniqueIp() {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}
