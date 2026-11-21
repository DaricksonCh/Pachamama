import { sql, type Kysely, type Selectable } from 'kysely';
import type { Database, DishesTable, MenuCategoriesTable, MenuStatus } from '../../db/types';

export type CategoryRow = Selectable<MenuCategoriesTable>;
export type DishRow = Selectable<DishesTable>;

export interface DishFilters {
  categoryId?: number;
  status?: MenuStatus;
  q?: string;
  provisional?: boolean;
  withoutImage?: boolean;
}

export type CategoryValues = {
  nameDe: string;
  nameEs: string;
  descriptionDe: string | null;
  descriptionEs: string | null;
  status: MenuStatus;
};

export type DishValues = {
  categoryId: number;
  nameDe: string;
  nameEs: string;
  descriptionDe: string | null;
  descriptionEs: string | null;
  price: string;
  diet: 'vegan' | 'vegetarian' | null;
  allergens: string;
  status: MenuStatus;
  isProvisional: boolean;
  provisionalNote: string | null;
  imageAltDe: string | null;
  imageAltEs: string | null;
};

export type CategoryWithCount = CategoryRow & { dishCount: number };

export type MenuSummaryRow = {
  visibleDishes: number;
  hiddenDishes: number;
  provisionalDishes: number;
  dishesWithoutImage: number;
  categories: number;
};

/** Escapa % _ \ para usar texto del usuario dentro de un LIKE como texto literal. */
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Acceso a datos de la carta. Solo SQL; las reglas de negocio viven en el service. */
export function createMenuRepository(db: Kysely<Database>) {
  const categoriesWithCount = () =>
    db
      .selectFrom('menuCategories')
      .selectAll('menuCategories')
      .select((eb) =>
        eb
          .selectFrom('dishes')
          .whereRef('dishes.categoryId', '=', 'menuCategories.id')
          .select(sql<number>`COUNT(*)`.as('n'))
          .as('dishCount'),
      );

  const withCount = <T extends { dishCount: number | string | null }>(row: T) => ({
    ...row,
    dishCount: Number(row.dishCount ?? 0),
  });

  return {
    async listCategories(status?: MenuStatus): Promise<CategoryWithCount[]> {
      let query = categoriesWithCount();
      if (status) query = query.where('menuCategories.status', '=', status);
      const rows = await query
        .orderBy('menuCategories.sortOrder')
        .orderBy('menuCategories.id')
        .execute();
      return rows.map(withCount);
    },

    async getCategory(id: number): Promise<CategoryWithCount | undefined> {
      const row = await categoriesWithCount()
        .where('menuCategories.id', '=', id)
        .executeTakeFirst();
      return row && withCount(row);
    },

    /** Alta al final del orden (MAX+1 dentro de la misma transacción). Devuelve el id. */
    async insertCategory(values: CategoryValues): Promise<number> {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom('menuCategories')
          .select(sql<number>`COALESCE(MAX(sort_order), 0)`.as('max'))
          .forUpdate()
          .executeTakeFirstOrThrow();
        const result = await trx
          .insertInto('menuCategories')
          .values({ ...values, sortOrder: Number(row.max) + 1 })
          .executeTakeFirstOrThrow();
        return Number(result.insertId);
      });
    },

    async updateCategory(id: number, patch: Partial<CategoryValues>) {
      if (Object.keys(patch).length === 0) return;
      await db.updateTable('menuCategories').set(patch).where('id', '=', id).execute();
    },

    async countActiveDishes(categoryId: number): Promise<number> {
      const row = await db
        .selectFrom('dishes')
        .select(sql<number>`COUNT(*)`.as('n'))
        .where('categoryId', '=', categoryId)
        .where('status', '<>', 'archived')
        .executeTakeFirstOrThrow();
      return Number(row.n);
    },

    /** Reasigna sort_order 1..n según el orden recibido. Devuelve false si algún id no existe. */
    async setCategoryOrder(ids: number[]): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const found = await trx
          .selectFrom('menuCategories')
          .select('id')
          .where('id', 'in', ids)
          .execute();
        if (found.length !== ids.length) return false;
        for (const [index, id] of ids.entries()) {
          await trx
            .updateTable('menuCategories')
            .set({ sortOrder: index + 1 })
            .where('id', '=', id)
            .execute();
        }
        return true;
      });
    },

    async listDishes(filters: DishFilters = {}): Promise<DishRow[]> {
      let query = db.selectFrom('dishes').selectAll();
      query = filters.status
        ? query.where('status', '=', filters.status)
        : query.where('status', '<>', 'archived');
      if (filters.categoryId !== undefined) {
        query = query.where('categoryId', '=', filters.categoryId);
      }
      if (filters.provisional) query = query.where('isProvisional', '=', true);
      if (filters.withoutImage) query = query.where('imageKey', 'is', null);
      if (filters.q) {
        const pattern = `%${escapeLike(filters.q)}%`;
        query = query.where((eb) =>
          eb.or([eb('nameDe', 'like', pattern), eb('nameEs', 'like', pattern)]),
        );
      }
      return query.orderBy('categoryId').orderBy('sortOrder').orderBy('id').execute();
    },

    getDish(id: number): Promise<DishRow | undefined> {
      return db.selectFrom('dishes').selectAll().where('id', '=', id).executeTakeFirst();
    },

    /** Alta al final del orden de su categoría. Devuelve el id. */
    async insertDish(values: Omit<DishValues, 'imageAltDe' | 'imageAltEs'>): Promise<number> {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom('dishes')
          .select(sql<number>`COALESCE(MAX(sort_order), 0)`.as('max'))
          .where('categoryId', '=', values.categoryId)
          .forUpdate()
          .executeTakeFirstOrThrow();
        const result = await trx
          .insertInto('dishes')
          .values({ ...values, sortOrder: Number(row.max) + 1 })
          .executeTakeFirstOrThrow();
        return Number(result.insertId);
      });
    },

    async setDishImage(id: number, image: { key: string; altDe: string; altEs: string } | null) {
      await db
        .updateTable('dishes')
        .set({
          imageKey: image?.key ?? null,
          imageAltDe: image?.altDe ?? null,
          imageAltEs: image?.altEs ?? null,
        })
        .where('id', '=', id)
        .execute();
    },

    async updateDish(id: number, patch: Partial<DishValues>) {
      if (Object.keys(patch).length === 0) return;
      await db.updateTable('dishes').set(patch).where('id', '=', id).execute();
    },

    /** Reasigna sort_order 1..n según el orden recibido. Devuelve false si algún id no existe. */
    async setDishOrder(ids: number[]): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const found = await trx
          .selectFrom('dishes')
          .select(['id', 'categoryId'])
          .where('id', 'in', ids)
          .execute();
        // Todos deben existir y pertenecer a la misma categoría.
        if (found.length !== ids.length || new Set(found.map((d) => d.categoryId)).size > 1) {
          return false;
        }
        for (const [index, id] of ids.entries()) {
          await trx
            .updateTable('dishes')
            .set({ sortOrder: index + 1 })
            .where('id', '=', id)
            .execute();
        }
        return true;
      });
    },

    async summary(): Promise<MenuSummaryRow> {
      const dishes = await db
        .selectFrom('dishes')
        .select([
          sql<string>`COALESCE(SUM(status = 'visible'), 0)`.as('visible'),
          sql<string>`COALESCE(SUM(status = 'hidden'), 0)`.as('hidden'),
          sql<string>`COALESCE(SUM(is_provisional AND status <> 'archived'), 0)`.as('provisional'),
          sql<string>`COALESCE(SUM(image_key IS NULL AND status <> 'archived'), 0)`.as('noImage'),
        ])
        .executeTakeFirstOrThrow();
      const cats = await db
        .selectFrom('menuCategories')
        .select(sql<string>`COUNT(*)`.as('n'))
        .where('status', '<>', 'archived')
        .executeTakeFirstOrThrow();
      return {
        visibleDishes: Number(dishes.visible),
        hiddenDishes: Number(dishes.hidden),
        provisionalDishes: Number(dishes.provisional),
        dishesWithoutImage: Number(dishes.noImage),
        categories: Number(cats.n),
      };
    },

    /** Carta pública: categorías visibles con sus platos visibles, ordenados. */
    async listPublic(): Promise<{ category: CategoryRow; dishes: DishRow[] }[]> {
      const categories = await db
        .selectFrom('menuCategories')
        .selectAll()
        .where('status', '=', 'visible')
        .orderBy('sortOrder')
        .orderBy('id')
        .execute();
      if (categories.length === 0) return [];
      const dishes = await db
        .selectFrom('dishes')
        .selectAll()
        .where('status', '=', 'visible')
        .where(
          'categoryId',
          'in',
          categories.map((c) => c.id),
        )
        .orderBy('sortOrder')
        .orderBy('id')
        .execute();
      return categories.map((category) => ({
        category,
        dishes: dishes.filter((d) => d.categoryId === category.id),
      }));
    },
  };
}

export type MenuRepository = ReturnType<typeof createMenuRepository>;
