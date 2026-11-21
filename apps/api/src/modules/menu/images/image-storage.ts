import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { IMAGE_WIDTHS } from './image-processor';

export type ImageStorage = {
  save(key: string, variants: { width: number; data: Buffer }[]): Promise<void>;
  remove(key: string): Promise<void>;
};

/** Guarda en `<dir>/dishes/<key>-<width>.webp`. Las claves son UUID generados por el servidor. */
export function createDiskImageStorage(dir: string): ImageStorage {
  const folder = join(dir, 'dishes');
  const file = (key: string, width: number) => join(folder, `${key}-${width}.webp`);
  return {
    async save(key, variants) {
      await mkdir(folder, { recursive: true });
      try {
        await Promise.all(variants.map((v) => writeFile(file(key, v.width), v.data)));
      } catch (err) {
        // Escritura a medias: no dejar archivos huérfanos.
        await this.remove(key);
        throw err;
      }
    },
    async remove(key) {
      await Promise.all(IMAGE_WIDTHS.map((w) => rm(file(key, w), { force: true })));
    },
  };
}
