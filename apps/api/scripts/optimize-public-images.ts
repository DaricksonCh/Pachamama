/**
 * Genera las versiones WebP de las fotos de la web pública, sin metadatos (EXIF/GPS).
 *   npx tsx apps/api/scripts/optimize-public-images.ts
 * Origen:  <raíz del repo>/material/fotos
 * Destino: apps/web/public/images/photos/<nombre>-<ancho>.webp
 * Anchos 640, 1280 y 1920; nunca se amplía: los anchos mayores que el original se omiten.
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WIDTHS = [640, 1280, 1920] as const;
const QUALITY = 78;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceDir = join(repoRoot, 'material', 'fotos');
const outputDir = join(repoRoot, 'apps', 'web', 'public', 'images', 'photos');

/** Nombre del archivo original (WhatsApp) -> nombre base de salida. */
const PHOTO_NAMES: Record<string, string> = {
  'WhatsApp Image 2026-11-21 at 05.40.23.jpeg': 'causa-limena',
  'WhatsApp Image 2026-11-21 at 05.40.24 (1).jpeg': 'mesa-surtida',
  'WhatsApp Image 2026-11-21 at 05.40.24.jpeg': 'ensalada-mixta',
  'WhatsApp Image 2026-11-21 at 05.40.25.jpeg': 'empanadas',
  'WhatsApp Image 2026-11-21 at 06.15.23 (1).jpeg': 'cocinera-retrato',
  'WhatsApp Image 2026-11-21 at 06.15.23 (2).jpeg': 'ensalada-quinua',
  'WhatsApp Image 2026-11-21 at 06.15.23.jpeg': 'tamal',
  'WhatsApp Image 2026-11-21 at 06.15.24 (1).jpeg': 'mariscos-fritos',
  'WhatsApp Image 2026-11-21 at 06.15.24.jpeg': 'equipo',
  'WhatsApp Image 2026-11-21 at 06.15.31 (1).jpeg': 'local-vertical',
  'WhatsApp Image 2026-11-21 at 06.15.31.jpeg': 'local-interior',
};

async function optimizePhoto(sourceFile: string, baseName: string): Promise<string[]> {
  const input = join(sourceDir, sourceFile);
  // rotate() aplica la orientación EXIF y después la descarta; no se llama a withMetadata(),
  // así que sharp no escribe EXIF, XMP, ICC ni GPS en el resultado.
  const image = sharp(input).rotate();
  const { width } = await image.metadata();
  if (width === undefined) throw new Error(`No se pudo leer el ancho de ${sourceFile}`);

  const written: string[] = [];
  for (const target of WIDTHS) {
    if (target > width) continue;
    const outFile = join(outputDir, `${baseName}-${target}.webp`);
    await sharp(input)
      .rotate()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outFile);

    const check = await sharp(outFile).metadata();
    if (check.exif !== undefined) throw new Error(`Quedan metadatos EXIF en ${outFile}`);
    written.push(`${baseName}-${target}.webp (${check.width}x${check.height})`);
  }
  return written;
}

async function main(): Promise<void> {
  if (!existsSync(sourceDir)) throw new Error(`No existe la carpeta de origen: ${sourceDir}`);
  const present = new Set(await readdir(sourceDir));
  const missing = Object.keys(PHOTO_NAMES).filter((name) => !present.has(name));
  if (missing.length > 0) throw new Error(`Faltan fotos de origen: ${missing.join(', ')}`);

  await mkdir(outputDir, { recursive: true });
  for (const [sourceFile, baseName] of Object.entries(PHOTO_NAMES)) {
    const files = await optimizePhoto(sourceFile, baseName);
    for (const line of files) console.log(`ok  ${line}  <-  ${sourceFile}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
