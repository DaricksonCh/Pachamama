import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { PublicMenu } from '@pachamama/shared';
import sharp from 'sharp';
import { logger } from '../../../lib/logger';

/** Foto de cada plato (JPEG pequeño), por id del plato. */
export type DishPhotos = Map<number, Buffer>;

/** Solo nombres generados por el servidor (`<uuid>-400.webp`): nunca rutas arbitrarias. */
const SAFE_FILE = /^[0-9a-f-]{36}-400\.webp$/;

/** Ancho de la miniatura: el hueco de la foto mide ~225 pt, así que ~1,6 px por punto. */
export const PDF_PHOTO_WIDTH = 360;

/**
 * Foto de todos los platos que tengan una (ADR 0017): se lee la versión de 400 px de
 * `UPLOADS_DIR` y se pasa a JPEG de 360 px, porque react-pdf no admite WebP y así el PDF
 * pesa poco. Si falta un archivo, el plato queda sin foto (el PDF se genera igual).
 */
export async function loadDishPhotos(menu: PublicMenu, uploadsDir: string): Promise<DishPhotos> {
  const photos: DishPhotos = new Map();
  const dishes = menu.categories.flatMap((c) => c.dishes).filter((d) => d.image);
  await Promise.all(
    dishes.map(async (dish) => {
      const file = basename(dish.image!.url.w400);
      if (!SAFE_FILE.test(file)) return;
      try {
        const webp = await readFile(join(uploadsDir, 'dishes', file));
        const data = await sharp(webp)
          .resize({ width: PDF_PHOTO_WIDTH, withoutEnlargement: true })
          .jpeg({ quality: 72, mozjpeg: true })
          .toBuffer();
        photos.set(dish.id, data);
      } catch (err) {
        logger.warn({ err, dishId: dish.id }, 'Menu PDF: dish photo not available');
      }
    }),
  );
  return photos;
}
