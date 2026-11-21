import { type Kysely, sql } from 'kysely';

/**
 * Tablas de autenticación (Better Auth + plugin admin) con nuestra convención:
 * plural y snake_case. IDs de texto generados por Better Auth. Fechas DATETIME(3) en UTC.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const now = sql`CURRENT_TIMESTAMP(3)`;

  await db.schema
    .createTable('users')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('email_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('image', 'text')
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('updated_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('role', 'varchar(255)')
    .addColumn('banned', 'boolean', (col) => col.defaultTo(false))
    .addColumn('ban_reason', 'text')
    .addColumn('ban_expires', sql`datetime(3)`)
    .execute();

  await db.schema
    .createTable('sessions')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('expires_at', sql`datetime(3)`, (col) => col.notNull())
    .addColumn('token', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('updated_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('ip_address', 'varchar(255)')
    .addColumn('user_agent', 'text')
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('impersonated_by', 'varchar(36)')
    // MySQL ignora REFERENCES dentro de la columna: la FK se declara aparte.
    .addForeignKeyConstraint('sessions_user_id_fk', ['user_id'], 'users', ['id'], (fk) =>
      fk.onDelete('cascade'),
    )
    .execute();
  await db.schema.createIndex('sessions_user_id_idx').on('sessions').column('user_id').execute();

  await db.schema
    .createTable('accounts')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('account_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('provider_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('id_token', 'text')
    .addColumn('access_token_expires_at', sql`datetime(3)`)
    .addColumn('refresh_token_expires_at', sql`datetime(3)`)
    .addColumn('scope', 'text')
    .addColumn('password', 'text')
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('updated_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addForeignKeyConstraint('accounts_user_id_fk', ['user_id'], 'users', ['id'], (fk) =>
      fk.onDelete('cascade'),
    )
    .execute();
  await db.schema.createIndex('accounts_user_id_idx').on('accounts').column('user_id').execute();

  await db.schema
    .createTable('verifications')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('identifier', 'varchar(255)', (col) => col.notNull())
    .addColumn('value', 'text', (col) => col.notNull())
    .addColumn('expires_at', sql`datetime(3)`, (col) => col.notNull())
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('updated_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .execute();
  await db.schema
    .createIndex('verifications_identifier_idx')
    .on('verifications')
    .column('identifier')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('verifications').execute();
  await db.schema.dropTable('accounts').execute();
  await db.schema.dropTable('sessions').execute();
  await db.schema.dropTable('users').execute();
}
