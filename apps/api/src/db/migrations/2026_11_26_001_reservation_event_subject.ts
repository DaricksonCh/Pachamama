import { type Kysely } from 'kysely';

/** Guarda el asunto enviado junto al mensaje, para reenviar exactamente lo que se envió. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('reservation_events').addColumn('subject', 'varchar(150)').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('reservation_events').dropColumn('subject').execute();
}
