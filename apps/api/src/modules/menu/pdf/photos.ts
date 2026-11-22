import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { PublicMenu } from '@pachamama/shared';
import sharp from 'sharp';
import { logger } from '../../../lib/logger';
import type { CategoryPhotos } from './menu-pdf';

/** Solo nombres generados por el servidor (`<uuid>-800.webp`): nunca rutas arbitrarias. */
const SAFE_FILE = /^[0-9a-f-]{36}-800\.webp$/;

/**
 * Una foto por categoría (la del primer plato que tenga): se lee la versión de 800 px de
 * `UPLOADS_DIR` y se pasa a JPEG, porque react-pdf no admite WebP.
 * Si falta un archivo, la categoría queda sin foto (el PDF se genera igual).
 */
export async function loadCategoryPhotos(
  menu: PublicMenu,
  uploadsDir: string,
): Promise<CategoryPhotos> {
  const photos: CategoryPhotos = new Map();
  await Promise.all(
    menu.categories.map(async (category) => {
      const dish = category.dishes.find((d) => d.image);
      if (!dish?.image) return;
      const file = basename(dish.image.url.w800);
      if (!SAFE_FILE.test(file)) return;
      try {
        const webp = await readFile(join(uploadsDir, 'dishes', file));
        const data = await sharp(webp).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
        photos.set(category.id, { dishId: dish.id, data });
      } catch (err) {
        logger.warn({ err, dishId: dish.id }, 'Menu PDF: dish photo not available');
      }
    }),
  );
  return photos;
}
