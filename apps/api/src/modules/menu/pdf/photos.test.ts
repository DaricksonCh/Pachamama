import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PublicMenu } from '@pachamama/shared';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { loadDishPhotos, PDF_PHOTO_WIDTH } from './photos';

type Dish = PublicMenu['categories'][number]['dishes'][number];

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

const image = (w400: string) => ({
  url: { w400, w800: w400.replace('-400', '-800'), w1600: w400.replace('-400', '-1600') },
  altDe: 'Foto',
  altEs: 'Foto',
});

const dish = (id: number, img: Dish['image']): Dish => ({
  id,
  nameDe: `Gericht ${id}`,
  nameEs: `Plato ${id}`,
  descriptionDe: null,
  descriptionEs: null,
  price: 10,
  diet: null,
  allergens: [],
  image: img,
});

async function uploadsWith(files: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-photos-'));
  mkdirSync(join(dir, 'dishes'));
  const webp = await sharp({
    create: { width: 400, height: 300, channels: 3, background: '#c8402a' },
  })
    .webp()
    .toBuffer();
  for (const f of files) writeFileSync(join(dir, 'dishes', f), webp);
  return dir;
}

describe('loadDishPhotos', () => {
  it('carga la foto de cada plato que la tenga, en JPEG de 360 px, aunque sean de la misma categoría', async () => {
    const dir = await uploadsWith([`${UUID_A}-400.webp`, `${UUID_B}-400.webp`]);
    const menu: PublicMenu = {
      categories: [
        {
          id: 1,
          nameDe: 'Vorspeisen',
          nameEs: 'Entrantes',
          descriptionDe: null,
          descriptionEs: null,
          dishes: [
            dish(1, image(`/uploads/dishes/${UUID_A}-400.webp`)),
            dish(2, image(`/uploads/dishes/${UUID_B}-400.webp`)),
            dish(3, null),
          ],
        },
      ],
    };
    const photos = await loadDishPhotos(menu, dir);
    expect([...photos.keys()].sort()).toEqual([1, 2]);
    const meta = await sharp(photos.get(1)!).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(PDF_PHOTO_WIDTH);
  });

  it('sin archivo o con un nombre no generado por el servidor: el plato queda sin foto', async () => {
    const dir = await uploadsWith([`${UUID_A}-400.webp`]);
    const menu: PublicMenu = {
      categories: [
        {
          id: 1,
          nameDe: 'Dips',
          nameEs: 'Salsas',
          descriptionDe: null,
          descriptionEs: null,
          dishes: [
            dish(1, image(`/uploads/dishes/${UUID_C}-400.webp`)),
            dish(2, image('/uploads/dishes/../../secret-400.webp')),
            dish(3, image(`/uploads/dishes/${UUID_A}-400.webp`)),
          ],
        },
      ],
    };
    const photos = await loadDishPhotos(menu, dir);
    expect([...photos.keys()]).toEqual([3]);
  });
});
