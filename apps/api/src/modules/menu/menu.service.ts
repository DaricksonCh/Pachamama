import { randomUUID } from 'node:crypto';
import {
  ALLERGEN_CODES,
  type AdminCategory,
  type AdminDish,
  type CategoryInput,
  type CategoryUpdate,
  type DishInput,
  type DishUpdate,
  type MenuStatus,
  type MenuSummary,
  type PublicMenu,
} from '@pachamama/shared';
import { AppError } from '../../lib/app-error';
import { logger } from '../../lib/logger';
import type { ImageStorage } from './images/image-storage';
import { processDishImage } from './images/image-processor';
import type { MenuEvents } from './menu-events';
import type {
  CategoryWithCount,
  DishFilters,
  DishRow,
  DishValues,
  MenuRepository,
} from './menu.repository';

const allergenSet = new Set<string>(ALLERGEN_CODES);

function parseAllergens(value: string): AdminDish['allergens'] {
  return value.split(',').filter((c): c is AdminDish['allergens'][number] => allergenSet.has(c));
}

function imageUrls(key: string) {
  const url = (w: number) => `/uploads/dishes/${key}-${w}.webp`;
  return { w400: url(400), w800: url(800), w1600: url(1600) };
}

function toAdminCategory(row: CategoryWithCount): AdminCategory {
  return {
    id: row.id,
    nameDe: row.nameDe,
    nameEs: row.nameEs,
    descriptionDe: row.descriptionDe,
    descriptionEs: row.descriptionEs,
    sortOrder: row.sortOrder,
    status: row.status,
    dishCount: row.dishCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAdminDish(row: DishRow): AdminDish {
  return {
    id: row.id,
    categoryId: row.categoryId,
    nameDe: row.nameDe,
    nameEs: row.nameEs,
    descriptionDe: row.descriptionDe,
    descriptionEs: row.descriptionEs,
    price: Number(row.price),
    diet: row.diet,
    allergens: parseAllergens(row.allergens),
    imageUrl: row.imageKey ? imageUrls(row.imageKey) : null,
    imageAltDe: row.imageAltDe,
    imageAltEs: row.imageAltEs,
    sortOrder: row.sortOrder,
    status: row.status,
    isProvisional: row.isProvisional,
    provisionalNote: row.provisionalNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Convierte un alta/cambio validado a columnas de BD (solo las claves presentes). */
function toDishValues(input: DishUpdate): Partial<DishValues> {
  const { price, allergens, ...rest } = input;
  const values: Partial<DishValues> = { ...rest };
  if (price !== undefined) values.price = price.toFixed(2);
  if (allergens !== undefined) values.allergens = allergens.join(',');
  for (const key of Object.keys(values) as (keyof DishValues)[]) {
    if (values[key] === undefined) delete values[key];
  }
  return values;
}

const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} not found`);

export function createMenuService(repo: MenuRepository, events: MenuEvents, storage: ImageStorage) {
  async function requireCategory(id: number) {
    const row = await repo.getCategory(id);
    if (!row) throw notFound('Category');
    return row;
  }

  async function requireDish(id: number) {
    const row = await repo.getDish(id);
    if (!row) throw notFound('Dish');
    return row;
  }

  async function assertCategoryExists(id: number) {
    const category = await repo.getCategory(id);
    if (!category || category.status === 'archived') {
      throw new AppError(400, 'INVALID_CATEGORY', 'Category does not exist', {
        categoryId: ['validation.invalidCategory'],
      });
    }
  }

  /** Borrado de archivos best-effort: la BD ya está al día, un fallo aquí solo deja un archivo huérfano. */
  async function removeQuietly(key: string) {
    try {
      await storage.remove(key);
    } catch (err) {
      logger.warn({ err, key }, 'Could not remove dish image files');
    }
  }

  return {
    async summary(): Promise<MenuSummary> {
      return repo.summary();
    },

    async listCategories(status?: MenuStatus): Promise<AdminCategory[]> {
      return (await repo.listCategories(status)).map(toAdminCategory);
    },

    async getCategory(id: number): Promise<AdminCategory> {
      return toAdminCategory(await requireCategory(id));
    },

    async createCategory(input: CategoryInput): Promise<AdminCategory> {
      const id = await repo.insertCategory({
        nameDe: input.nameDe,
        nameEs: input.nameEs,
        descriptionDe: input.descriptionDe ?? null,
        descriptionEs: input.descriptionEs ?? null,
        status: input.status,
      });
      events.emitMenuChanged();
      return toAdminCategory(await requireCategory(id));
    },

    async updateCategory(id: number, patch: CategoryUpdate): Promise<AdminCategory> {
      await requireCategory(id);
      if (patch.status === 'archived' && (await repo.countActiveDishes(id)) > 0) {
        throw new AppError(
          409,
          'CATEGORY_HAS_DISHES',
          'Archive or move the dishes of this category first',
        );
      }
      const values = { ...patch };
      for (const key of Object.keys(values) as (keyof CategoryUpdate)[]) {
        if (values[key] === undefined) delete values[key];
      }
      await repo.updateCategory(id, values as Parameters<MenuRepository['updateCategory']>[1]);
      events.emitMenuChanged();
      return toAdminCategory(await requireCategory(id));
    },

    /** Devuelve false si algún id no existe. */
    async reorderCategories(ids: number[]): Promise<void> {
      if (!(await repo.setCategoryOrder(ids))) {
        throw new AppError(400, 'INVALID_ORDER', 'Unknown id in order list');
      }
      events.emitMenuChanged();
    },

    async listDishes(filters: DishFilters): Promise<AdminDish[]> {
      return (await repo.listDishes(filters)).map(toAdminDish);
    },

    async getDish(id: number): Promise<AdminDish> {
      return toAdminDish(await requireDish(id));
    },

    async createDish(input: DishInput): Promise<AdminDish> {
      await assertCategoryExists(input.categoryId);
      const { imageAltDe: _de, imageAltEs: _es, ...values } = toDishValues(input) as DishValues;
      const id = await repo.insertDish({
        ...values,
        descriptionDe: values.descriptionDe ?? null,
        descriptionEs: values.descriptionEs ?? null,
        provisionalNote: values.provisionalNote ?? null,
      });
      events.emitMenuChanged();
      return toAdminDish(await requireDish(id));
    },

    /** staff solo puede cambiar `status` entre visible/oculto; cualquier otra cosa → 403. */
    async updateDish(id: number, patch: DishUpdate, role: string | null | undefined) {
      if (role !== 'admin') {
        const keys = Object.entries(patch)
          .filter(([, v]) => v !== undefined)
          .map(([k]) => k);
        const onlyStatus = keys.every((k) => k === 'status');
        const status = patch.status;
        if (!onlyStatus || (status !== undefined && status !== 'visible' && status !== 'hidden')) {
          throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
        }
      }
      const current = await requireDish(id);
      if (role !== 'admin' && current.status === 'archived') {
        throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
      }
      if (patch.categoryId !== undefined && patch.categoryId !== current.categoryId) {
        await assertCategoryExists(patch.categoryId);
      }
      if (
        (patch.imageAltDe !== undefined || patch.imageAltEs !== undefined) &&
        current.imageKey === null
      ) {
        throw new AppError(400, 'NO_IMAGE', 'Dish has no image', {
          imageAltDe: ['validation.noImage'],
        });
      }
      await repo.updateDish(id, toDishValues(patch));
      events.emitMenuChanged();
      return toAdminDish(await requireDish(id));
    },

    /** Procesa y guarda la foto, actualiza la BD y borra la anterior. */
    async setDishImage(
      id: number,
      buffer: Buffer,
      alt: { altDe: string; altEs: string },
    ): Promise<AdminDish> {
      const current = await requireDish(id);
      const variants = await processDishImage(buffer);
      const key = randomUUID();
      try {
        await storage.save(key, variants);
      } catch (err) {
        await removeQuietly(key);
        throw err;
      }
      try {
        await repo.setDishImage(id, { key, ...alt });
      } catch (err) {
        await removeQuietly(key);
        throw err;
      }
      if (current.imageKey) await removeQuietly(current.imageKey);
      events.emitMenuChanged();
      return toAdminDish(await requireDish(id));
    },

    async removeDishImage(id: number): Promise<AdminDish> {
      const current = await requireDish(id);
      await repo.setDishImage(id, null);
      if (current.imageKey) await removeQuietly(current.imageKey);
      events.emitMenuChanged();
      return toAdminDish(await requireDish(id));
    },

    async reorderDishes(ids: number[]): Promise<void> {
      if (!(await repo.setDishOrder(ids))) {
        throw new AppError(400, 'INVALID_ORDER', 'Unknown id in order list');
      }
      events.emitMenuChanged();
    },

    /** Carta pública (categorías y platos visibles, sin campos internos). */
    async publicMenu(): Promise<PublicMenu> {
      const groups = await repo.listPublic();
      return {
        categories: groups.map(({ category: c, dishes }) => ({
          id: c.id,
          nameDe: c.nameDe,
          nameEs: c.nameEs,
          descriptionDe: c.descriptionDe,
          descriptionEs: c.descriptionEs,
          dishes: dishes.map((d) => ({
            id: d.id,
            nameDe: d.nameDe,
            nameEs: d.nameEs,
            descriptionDe: d.descriptionDe,
            descriptionEs: d.descriptionEs,
            price: Number(d.price),
            diet: d.diet,
            allergens: parseAllergens(d.allergens),
            image: d.imageKey
              ? { url: imageUrls(d.imageKey), altDe: d.imageAltDe ?? '', altEs: d.imageAltEs ?? '' }
              : null,
          })),
        })),
      };
    },
  };
}

export type MenuService = ReturnType<typeof createMenuService>;
