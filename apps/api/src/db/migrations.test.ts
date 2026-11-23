import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from './database';
import { migrateDownAll, migrateToLatest } from './migrator';
import { migrations } from './migrations';

const AUTH_AND_MENU_TABLES = [
  'accounts',
  'closures',
  'dishes',
  'menu_categories',
  'opening_hours',
  'reservation_events',
  'reservation_message_templates',
  'reservation_settings',
  'reservations',
  'sessions',
  'users',
  'verifications',
];

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
    expect(await tableNames()).toEqual(AUTH_AND_MENU_TABLES);
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
    expect(await tableNames()).toEqual(AUTH_AND_MENU_TABLES);
  });

  it('borrar un usuario borra en cascada sus sesiones y cuentas', async () => {
    const { rows } = await sql<{ rule: string; table: string }>`
      SELECT delete_rule AS rule, table_name AS \`table\`
      FROM information_schema.referential_constraints
      WHERE constraint_schema = DATABASE()`.execute(db);
    expect(rows.map((r) => `${r.table}:${r.rule}`).sort()).toEqual([
      'accounts:CASCADE',
      'dishes:RESTRICT',
      'reservation_events:CASCADE',
      'reservation_events:SET NULL',
      'reservations:SET NULL',
      'sessions:CASCADE',
    ]);
  });

  it('dishes: precio DECIMAL(10,2), alérgenos SET y estado ENUM', async () => {
    const dishes = await columns('dishes');
    expect(dishes.price?.type).toBe('decimal(10,2)');
    expect(dishes.allergens?.type).toMatch(/^set\('A','B','C'/);
    expect(dishes.allergens?.type).toContain("'N'");
    expect(dishes.status?.type).toBe("enum('visible','hidden','archived')");
    expect(dishes.diet?.type).toBe("enum('vegan','vegetarian')");
    expect(dishes.diet?.nullable).toBe('YES');
  });

  it('dishes: la clave foránea a categorías es RESTRICT', async () => {
    await sql`DELETE FROM dishes`.execute(db);
    await sql`DELETE FROM menu_categories`.execute(db);
    await expect(
      sql`INSERT INTO dishes (category_id, name_de, name_es, price) VALUES (999999, 'a', 'b', 1.00)`.execute(
        db,
      ),
    ).rejects.toThrow();

    await sql`INSERT INTO menu_categories (name_de, name_es) VALUES ('K', 'C')`.execute(db);
    await sql`INSERT INTO dishes (category_id, name_de, name_es, price)
      SELECT id, 'a', 'b', 1.00 FROM menu_categories`.execute(db);
    await expect(sql`DELETE FROM menu_categories`.execute(db)).rejects.toThrow();

    await sql`DELETE FROM dishes`.execute(db);
    await sql`DELETE FROM menu_categories`.execute(db);
  });

  it('reservas: crea las semillas (horario, ajustes por defecto y plantillas)', async () => {
    const hours = await sql<{ weekday: number; opens: string; closes: string }>`
      SELECT weekday, opens, closes FROM opening_hours ORDER BY weekday`.execute(db);
    expect(hours.rows.map((r) => r.weekday)).toEqual([0, 2, 3, 4, 5, 6]);
    expect(hours.rows.every((r) => r.opens === '13:00:00' && r.closes === '22:00:00')).toBe(true);

    const settings = await db.selectFrom('reservationSettings').selectAll().execute();
    expect(settings).toHaveLength(1);
    expect(settings[0]).toMatchObject({
      id: 1,
      slotMinutes: 30,
      lastSlotBeforeCloseMinutes: 60,
      partyMin: 1,
      partyMax: 10,
      capacityPerSlot: 30,
      minLeadMinutes: 120,
      maxAdvanceDays: 60,
    });
    expect(Boolean(settings[0]?.sameDayOnline)).toBe(false);
    expect(Boolean(settings[0]?.hoursConfirmed)).toBe(false);

    const templates = await db
      .selectFrom('reservationMessageTemplates')
      .select(['kind', 'lang', 'subject', 'body'])
      .execute();
    expect(templates.map((t) => `${t.kind}:${t.lang}`).sort()).toEqual([
      'cancelled:de',
      'cancelled:es',
      'confirmed:de',
      'confirmed:es',
      'received:de',
      'received:es',
      'rejected:de',
      'rejected:es',
    ]);
    expect(templates.every((t) => t.subject.length > 0 && t.body.includes('{name}'))).toBe(true);
  });

  it('reservas: estados y tipos de columna', async () => {
    const r = await columns('reservations');
    expect(r.status?.type).toBe(
      "enum('pending','confirmed','rejected','cancelled','completed','no_show')",
    );
    expect(r.lang?.type).toBe("enum('de','es')");
    expect(r.starts_at?.type).toBe('datetime(3)');
    expect(r.public_id?.type).toBe('char(36)');
    expect(r.decided_by?.nullable).toBe('YES');
    const e = await columns('reservation_events');
    expect(e.email_status?.type).toBe("enum('sent','failed','skipped')");
    expect(e.email_status?.nullable).toBe('YES');
    expect(e.subject?.type).toBe('varchar(150)');
    expect(e.subject?.nullable).toBe('YES');
  });
});
