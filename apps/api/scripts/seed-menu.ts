/**
 * Carga inicial de la carta (una sola vez; no hace nada si ya hay categorías).
 *   npm run db:seed:menu                          → fotos de <raíz del repo>/material/fotos si existe
 *   npm run db:seed:menu -- --photos <carpeta>    → otra carpeta de fotos (o MENU_PHOTOS_DIR)
 * Usa la BD de DATABASE_URL y guarda las fotos en UPLOADS_DIR (como la API).
 * Después hay que reiniciar la API: la versión de la carta (ETag del PDF) vive en su memoria.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { env } from '../src/config/env';
import { db } from '../src/db/database';
import { createDiskImageStorage } from '../src/modules/menu/images/image-storage';
import { createMenuEvents } from '../src/modules/menu/menu-events';
import { createMenuRepository } from '../src/modules/menu/menu.repository';
import { createMenuService } from '../src/modules/menu/menu.service';
import { MENU_SEED, seedMenu } from './data/menu-seed';

const { values } = parseArgs({ options: { photos: { type: 'string' } } });

const defaultPhotosDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../material/fotos',
);
let photosDir = values.photos ?? process.env.MENU_PHOTOS_DIR;
let missingDefaultPhotosDir = false;
if (photosDir === undefined) {
  if (existsSync(defaultPhotosDir)) photosDir = defaultPhotosDir;
  else missingDefaultPhotosDir = true;
}

try {
  const service = createMenuService(
    createMenuRepository(db),
    createMenuEvents(),
    createDiskImageStorage(env.UPLOADS_DIR),
  );
  const result = await seedMenu(service, {
    photosDir,
    warn: (message) => console.warn(`⚠ ${message}`),
  });
  if (result.created && missingDefaultPhotosDir) {
    console.warn(`⚠ Sin carpeta de fotos (${defaultPhotosDir}): la carta se carga sin fotos.`);
  }
  if (!result.created) {
    console.log('La carta ya tiene categorías: no se ha cargado nada (se gestiona en /admin).');
  } else {
    const provisional = MENU_SEED.flatMap((g) => g.dishes).filter((d) => d.isProvisional).length;
    console.log(
      `✔ Carta cargada: ${MENU_SEED.length} categorías, ${result.dishes} platos ` +
        `(${provisional} provisionales, ver docs/pendientes.md), ${result.photos} fotos.`,
    );
    console.log('  Reinicia la API para que el PDF de la carta se regenere con la carta nueva.');
  }
} catch (err) {
  console.error('✖', err instanceof Error ? err.message : err);
  console.error(
    '  Si la carga se quedó a medias, vacía las tablas de la carta antes de repetirla.',
  );
  process.exitCode = 1;
} finally {
  await db.destroy();
}
