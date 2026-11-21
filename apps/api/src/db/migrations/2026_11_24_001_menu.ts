import { type Kysely, sql } from 'kysely';

// Valores congelados a propósito: una migración es una instantánea inmutable y no debe
// depender de constantes compartidas que puedan cambiar después.
const STATUSES = ['visible', 'hidden', 'archived'] as const;
const DIETS = ['vegan', 'vegetarian'] as const;
const ALLERGEN_CODES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
] as const;

const enumOf = (values: readonly string[]) =>
  sql.raw(`enum(${values.map((v) => `'${v}'`).join(',')})`);
const setOf = (values: readonly string[]) =>
  sql.raw(`set(${values.map((v) => `'${v}'`).join(',')})`);

/**
 * Carta: categorías y platos. Precio DECIMAL(10,2) en euros, alérgenos como SET (A-N),
 * estados visible/hidden/archived. Platos -> categoría con ON DELETE RESTRICT.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const now = sql`CURRENT_TIMESTAMP(3)`;
  const onUpdate = sql`datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`;

  await db.schema
    .createTable('menu_categories')
    .addColumn('id', sql`int unsigned`, (col) => col.primaryKey().autoIncrement())
    .addColumn('name_de', 'varchar(80)', (col) => col.notNull())
    .addColumn('name_es', 'varchar(80)', (col) => col.notNull())
    .addColumn('description_de', 'varchar(500)')
    .addColumn('description_es', 'varchar(500)')
    .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('status', enumOf(STATUSES), (col) => col.notNull().defaultTo('visible'))
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('updated_at', onUpdate)
    .execute();

  await db.schema
    .createTable('dishes')
    .addColumn('id', sql`int unsigned`, (col) => col.primaryKey().autoIncrement())
    .addColumn('category_id', sql`int unsigned`, (col) => col.notNull())
    .addColumn('name_de', 'varchar(120)', (col) => col.notNull())
    .addColumn('name_es', 'varchar(120)', (col) => col.notNull())
    .addColumn('description_de', 'varchar(1000)')
    .addColumn('description_es', 'varchar(1000)')
    .addColumn('price', sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn('diet', enumOf(DIETS))
    .addColumn('allergens', setOf(ALLERGEN_CODES), (col) => col.notNull().defaultTo(''))
    .addColumn('image_key', 'char(36)')
    .addColumn('image_alt_de', 'varchar(200)')
    .addColumn('image_alt_es', 'varchar(200)')
    .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('status', enumOf(STATUSES), (col) => col.notNull().defaultTo('visible'))
    .addColumn('is_provisional', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('provisional_note', 'varchar(300)')
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull().defaultTo(now))
    .addColumn('updated_at', onUpdate)
    // MySQL ignora REFERENCES dentro de la columna: la FK se declara aparte.
    .addForeignKeyConstraint(
      'dishes_category_id_fk',
      ['category_id'],
      'menu_categories',
      ['id'],
      (fk) => fk.onDelete('restrict'),
    )
    .execute();
  await db.schema
    .createIndex('dishes_category_status_sort_idx')
    .on('dishes')
    .columns(['category_id', 'status', 'sort_order'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('dishes').execute();
  await db.schema.dropTable('menu_categories').execute();
}
