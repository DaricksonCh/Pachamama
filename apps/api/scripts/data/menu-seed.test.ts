import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { categoryInputSchema, dishInputSchema } from '@pachamama/shared';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/db/database';
import { createDiskImageStorage } from '../../src/modules/menu/images/image-storage';
import { createMenuEvents } from '../../src/modules/menu/menu-events';
import { createMenuRepository } from '../../src/modules/menu/menu.repository';
import { createMenuService } from '../../src/modules/menu/menu.service';
import { resetMenuTables } from '../../src/test/db-helpers';
import { MENU_SEED, PHOTO_MAP, seedMenu } from './menu-seed';

const allDishes = MENU_SEED.flatMap((group) => group.dishes);
const totalDishes = allDishes.length;

function makeService() {
  const uploads = mkdtempSync(join(tmpdir(), 'pachamama-seed-uploads-'));
  return createMenuService(
    createMenuRepository(db),
    createMenuEvents(),
    createDiskImageStorage(uploads),
  );
}

describe('MENU_SEED (datos)', () => {
  it('tiene las 7 categorías del spec, en orden', () => {
    expect(MENU_SEED.map((g) => g.category.nameDe)).toEqual([
      'Vorspeisen',
      'Suppen & Salate',
      'Fingerfood',
      'Hauptgerichte',
      'Vom Grill – Anticuchos',
      'Beilagen',
      'Dips',
    ]);
  });

  it('cada categoría y cada plato pasan los schemas compartidos', () => {
    for (const group of MENU_SEED) {
      expect(categoryInputSchema.safeParse(group.category).success).toBe(true);
      for (const dish of group.dishes) {
        const result = dishInputSchema.safeParse({ ...dish, categoryId: 1 });
        expect(result.success, `${dish.nameDe}: ${JSON.stringify(result.error?.issues)}`).toBe(
          true,
        );
      }
    }
  });

  it('no hay nombres repetidos (ni en alemán ni en español)', () => {
    const de = allDishes.map((d) => d.nameDe.toLowerCase());
    const es = allDishes.map((d) => d.nameEs.toLowerCase());
    expect(new Set(de).size).toBe(de.length);
    expect(new Set(es).size).toBe(es.length);
  });

  it('todo plato provisional tiene nota, y ningún plato con nota deja de ser provisional', () => {
    for (const dish of allDishes) {
      expect(Boolean(dish.provisionalNote?.trim()), dish.nameDe).toBe(dish.isProvisional);
    }
  });

  it('las dudas conocidas están marcadas como provisionales', () => {
    const provisional = new Set(allDishes.filter((d) => d.isProvisional).map((d) => d.nameDe));
    for (const name of [
      'Papa rellena vegan',
      'Tamal de Pollo',
      'Causa Acevichada',
      'Tiradito',
      'Anticuchos Veganos',
      'Anticuchos de Carne',
      'Crema de Oliva',
      'Crema Pikante',
    ]) {
      expect(provisional.has(name), name).toBe(true);
    }
    const tiradito = allDishes.find((d) => d.nameDe === 'Tiradito');
    expect(tiradito).toMatchObject({ price: 13, status: 'visible' });
  });

  it('todos los platos se cargan visibles y sin textos en inglés evidentes', () => {
    for (const dish of allDishes) {
      expect(dish.status).toBe('visible');
      expect(dish.descriptionDe ?? '').not.toMatch(/\b(with|served|and)\b/i);
    }
  });

  it('cada foto del mapa apunta a un plato existente y lleva alt de/es', () => {
    const names = new Set(allDishes.map((d) => d.nameDe));
    expect(Object.keys(PHOTO_MAP).length).toBeGreaterThan(0);
    for (const [file, photo] of Object.entries(PHOTO_MAP)) {
      expect(names.has(photo.dish), `${file} → ${photo.dish}`).toBe(true);
      expect(photo.altDe.trim().length).toBeGreaterThan(0);
      expect(photo.altEs.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('seedMenu (BD de tests)', () => {
  beforeEach(async () => {
    await resetMenuTables();
  });

  it('crea las 7 categorías y todos los platos; una segunda llamada no duplica nada', async () => {
    const service = makeService();
    const first = await seedMenu(service, {});
    expect(first).toEqual({ created: true, dishes: totalDishes, photos: 0 });

    const categories = await service.listCategories();
    expect(categories.map((c) => c.nameDe)).toEqual(MENU_SEED.map((g) => g.category.nameDe));
    expect(categories.map((c) => c.dishCount)).toEqual(MENU_SEED.map((g) => g.dishes.length));

    const dishes = await service.listDishes({});
    expect(dishes).toHaveLength(totalDishes);
    const tiradito = dishes.find((d) => d.nameDe === 'Tiradito');
    expect(tiradito).toMatchObject({ price: 13, isProvisional: true, status: 'visible' });

    const second = await seedMenu(service, {});
    expect(second).toEqual({ created: false, dishes: 0, photos: 0 });
    expect(await service.listDishes({})).toHaveLength(totalDishes);
  });

  it('procesa las fotos del mapa que existan en la carpeta (por el servicio de imágenes)', async () => {
    const photosDir = mkdtempSync(join(tmpdir(), 'pachamama-seed-photos-'));
    const [file, photo] = Object.entries(PHOTO_MAP)[0]!;
    const jpeg = await sharp({
      create: { width: 640, height: 480, channels: 3, background: '#aa5522' },
    })
      .jpeg()
      .toBuffer();
    writeFileSync(join(photosDir, file), jpeg);

    const service = makeService();
    const result = await seedMenu(service, { photosDir });
    expect(result).toEqual({ created: true, dishes: totalDishes, photos: 1 });

    const dish = (await service.listDishes({})).find((d) => d.nameDe === photo.dish);
    expect(dish?.imageUrl).not.toBeNull();
    expect(dish).toMatchObject({ imageAltDe: photo.altDe, imageAltEs: photo.altEs });
  });

  it('sin la carpeta de fotos avisa y sigue', async () => {
    const warn = vi.fn();
    const result = await seedMenu(makeService(), {
      photosDir: join(tmpdir(), 'pachamama-no-such-folder-xyz'),
      warn,
    });
    expect(result).toEqual({ created: true, dishes: totalDishes, photos: 0 });
    expect(warn).toHaveBeenCalled();
  });
});
