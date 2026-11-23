import { type Kysely, sql } from 'kysely';

// Valores congelados a propósito: una migración es una instantánea inmutable y no debe
// depender de constantes compartidas que puedan cambiar después.
const STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'] as const;
const LANGS = ['de', 'es'] as const;
const KINDS = ['received', 'confirmed', 'rejected', 'cancelled'] as const;
const EMAIL_STATUSES = ['sent', 'failed', 'skipped'] as const;

const enumOf = (values: readonly string[]) =>
  sql.raw(`enum(${values.map((v) => `'${v}'`).join(',')})`);

/** Plantillas iniciales (editables desde el panel). Variables: {name} {date} {time} {party}. */
const TEMPLATES: ReadonlyArray<{ kind: string; lang: string; subject: string; body: string }> = [
  {
    kind: 'received',
    lang: 'de',
    subject: 'Wir haben Ihre Reservierungsanfrage erhalten',
    body: 'Hallo {name},\n\nvielen Dank für Ihre Anfrage! Wir haben Ihre Reservierung für {party} Personen am {date} um {time} Uhr erhalten und prüfen sie so schnell wie möglich. Sie erhalten von uns eine weitere Nachricht, sobald sie bestätigt ist.\n\nHerzliche Grüße\nIhr Pachamama-Team',
  },
  {
    kind: 'received',
    lang: 'es',
    subject: 'Hemos recibido su solicitud de reserva',
    body: 'Hola {name}:\n\n¡Muchas gracias por su solicitud! Hemos recibido su reserva para {party} personas el {date} a las {time} y la revisaremos lo antes posible. Le escribiremos de nuevo en cuanto esté confirmada.\n\nUn cordial saludo\nEl equipo de Pachamama',
  },
  {
    kind: 'confirmed',
    lang: 'de',
    subject: 'Ihre Reservierung im Pachamama ist bestätigt',
    body: 'Hallo {name},\n\nwir freuen uns, Ihre Reservierung zu bestätigen: {party} Personen am {date} um {time} Uhr. Wir erwarten Sie gern im Pachamama.\n\nFalls sich etwas ändert, rufen Sie uns bitte kurz an.\n\nHerzliche Grüße\nIhr Pachamama-Team',
  },
  {
    kind: 'confirmed',
    lang: 'es',
    subject: 'Su reserva en Pachamama está confirmada',
    body: 'Hola {name}:\n\nNos alegra confirmar su reserva: {party} personas el {date} a las {time}. Le esperamos con mucho gusto en Pachamama.\n\nSi algo cambia, por favor llámenos para avisarnos.\n\nUn cordial saludo\nEl equipo de Pachamama',
  },
  {
    kind: 'rejected',
    lang: 'de',
    subject: 'Zu Ihrer Reservierungsanfrage im Pachamama',
    body: 'Hallo {name},\n\nleider können wir Ihre Reservierung für {party} Personen am {date} um {time} Uhr nicht bestätigen. Gern finden wir gemeinsam eine Lösung: Rufen Sie uns einfach an oder wählen Sie einen anderen Zeitpunkt.\n\nWir bitten um Ihr Verständnis und hoffen, Sie bald bei uns begrüßen zu dürfen.\n\nHerzliche Grüße\nIhr Pachamama-Team',
  },
  {
    kind: 'rejected',
    lang: 'es',
    subject: 'Sobre su solicitud de reserva en Pachamama',
    body: 'Hola {name}:\n\nLamentablemente no podemos confirmar su reserva para {party} personas el {date} a las {time}. Con gusto buscamos otra solución: llámenos o elija otro horario.\n\nAgradecemos su comprensión y esperamos recibirle pronto.\n\nUn cordial saludo\nEl equipo de Pachamama',
  },
  {
    kind: 'cancelled',
    lang: 'de',
    subject: 'Ihre Reservierung im Pachamama wurde storniert',
    body: 'Hallo {name},\n\nIhre Reservierung für {party} Personen am {date} um {time} Uhr wurde storniert. Wenn Sie einen neuen Termin wünschen, reservieren Sie gern erneut oder rufen Sie uns an.\n\nHerzliche Grüße\nIhr Pachamama-Team',
  },
  {
    kind: 'cancelled',
    lang: 'es',
    subject: 'Su reserva en Pachamama ha sido cancelada',
    body: 'Hola {name}:\n\nSu reserva para {party} personas el {date} a las {time} ha sido cancelada. Si desea otra fecha, puede reservar de nuevo o llamarnos.\n\nUn cordial saludo\nEl equipo de Pachamama',
  },
];

/**
 * Reservas de mesa: horario de apertura, cierres, ajustes (fila única id=1), plantillas de
 * mensajes, reservas y su historial. Fechas en UTC (datetime(3)); weekday 0 = domingo.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const now = sql`CURRENT_TIMESTAMP(3)`;
  const onUpdate = sql`datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`;

  await db.schema
    .createTable('opening_hours')
    .addColumn('id', sql`int unsigned`, (col) => col.primaryKey().autoIncrement())
    .addColumn('weekday', sql`tinyint unsigned`, (col) => col.notNull())
    .addColumn('opens', sql`time`, (col) => col.notNull())
    .addColumn('closes', sql`time`, (col) => col.notNull())
    .addCheckConstraint('opening_hours_weekday_chk', sql`weekday BETWEEN 0 AND 6`)
    .execute();
  await db.schema
    .createIndex('opening_hours_weekday_idx')
    .on('opening_hours')
    .column('weekday')
    .execute();
  // Semilla provisional: martes a domingo 13:00-22:00, lunes cerrado.
  await sql`INSERT INTO opening_hours (weekday, opens, closes) VALUES
    (2,'13:00:00','22:00:00'),(3,'13:00:00','22:00:00'),(4,'13:00:00','22:00:00'),
    (5,'13:00:00','22:00:00'),(6,'13:00:00','22:00:00'),(0,'13:00:00','22:00:00')`.execute(db);

  await db.schema
    .createTable('closures')
    .addColumn('id', sql`int unsigned`, (col) => col.primaryKey().autoIncrement())
    .addColumn('from_date', sql`date`, (col) => col.notNull())
    .addColumn('to_date', sql`date`, (col) => col.notNull())
    .addColumn('reason_de', 'varchar(200)')
    .addColumn('reason_es', 'varchar(200)')
    .addCheckConstraint('closures_range_chk', sql`from_date <= to_date`)
    .execute();
  await db.schema
    .createIndex('closures_dates_idx')
    .on('closures')
    .columns(['from_date', 'to_date'])
    .execute();

  await db.schema
    .createTable('reservation_settings')
    .addColumn('id', sql`tinyint unsigned`, (col) => col.primaryKey())
    .addColumn('slot_minutes', 'integer', (col) => col.notNull().defaultTo(30))
    .addColumn('last_slot_before_close_minutes', 'integer', (col) => col.notNull().defaultTo(60))
    .addColumn('party_min', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('party_max', 'integer', (col) => col.notNull().defaultTo(10))
    .addColumn('capacity_per_slot', 'integer', (col) => col.notNull().defaultTo(30))
    .addColumn('min_lead_minutes', 'integer', (col) => col.notNull().defaultTo(120))
    .addColumn('max_advance_days', 'integer', (col) => col.notNull().defaultTo(60))
    .addColumn('same_day_online', 'boolean', (col) => col.notNull().defaultTo(false))
    // Pasa a true al guardar el horario desde el panel (mientras tanto es provisional).
    .addColumn('hours_confirmed', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('updated_at', onUpdate)
    .addCheckConstraint('reservation_settings_single_row_chk', sql`id = 1`)
    .execute();
  await sql`INSERT INTO reservation_settings (id) VALUES (1)`.execute(db);

  await db.schema
    .createTable('reservation_message_templates')
    .addColumn('kind', enumOf(KINDS), (col) => col.notNull())
    .addColumn('lang', enumOf(LANGS), (col) => col.notNull())
    .addColumn('subject', 'varchar(150)', (col) => col.notNull())
    .addColumn('body', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('reservation_message_templates_pk', ['kind', 'lang'])
    .execute();
  for (const t of TEMPLATES) {
    await sql`INSERT INTO reservation_message_templates (kind, lang, subject, body)
      VALUES (${t.kind}, ${t.lang}, ${t.subject}, ${t.body})`.execute(db);
  }

  await db.schema
    .createTable('reservations')
    .addColumn('id', sql`int unsigned`, (col) => col.primaryKey().autoIncrement())
    .addColumn('public_id', 'char(36)', (col) => col.notNull().unique())
    .addColumn('starts_at', sql`datetime(3)`, (col) => col.notNull())
    .addColumn('party_size', sql`tinyint unsigned`, (col) => col.notNull())
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('phone', 'varchar(40)', (col) => col.notNull())
    .addColumn('comment', 'varchar(500)')
    .addColumn('lang', enumOf(LANGS), (col) => col.notNull())
    .addColumn('status', enumOf(STATUSES), (col) => col.notNull().defaultTo('pending'))
    .addColumn('decided_by', 'varchar(36)')
    .addColumn('decided_at', sql`datetime(3)`)
    .addColumn('anonymized_at', sql`datetime(3)`)
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('updated_at', onUpdate)
    .addForeignKeyConstraint('reservations_decided_by_fk', ['decided_by'], 'users', ['id'], (fk) =>
      fk.onDelete('set null'),
    )
    .execute();
  await db.schema
    .createIndex('reservations_starts_at_status_idx')
    .on('reservations')
    .columns(['starts_at', 'status'])
    .execute();

  await db.schema
    .createTable('reservation_events')
    .addColumn('id', sql`int unsigned`, (col) => col.primaryKey().autoIncrement())
    .addColumn('reservation_id', sql`int unsigned`, (col) => col.notNull())
    .addColumn('from_status', enumOf(STATUSES))
    .addColumn('to_status', enumOf(STATUSES), (col) => col.notNull())
    .addColumn('actor_id', 'varchar(36)')
    .addColumn('message', 'text')
    // null cuando no se envía correo en ese cambio.
    .addColumn('email_status', enumOf(EMAIL_STATUSES))
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addForeignKeyConstraint(
      'reservation_events_reservation_id_fk',
      ['reservation_id'],
      'reservations',
      ['id'],
      (fk) => fk.onDelete('cascade'),
    )
    .addForeignKeyConstraint(
      'reservation_events_actor_id_fk',
      ['actor_id'],
      'users',
      ['id'],
      (fk) => fk.onDelete('set null'),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('reservation_events').execute();
  await db.schema.dropTable('reservations').execute();
  await db.schema.dropTable('reservation_message_templates').execute();
  await db.schema.dropTable('reservation_settings').execute();
  await db.schema.dropTable('closures').execute();
  await db.schema.dropTable('opening_hours').execute();
}
