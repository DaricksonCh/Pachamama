/**
 * Genera las versiones WebP de las fotos de la web pública, sin metadatos (EXIF/GPS).
 *   npx tsx apps/api/scripts/optimize-public-images.ts
 * Origen:  <raíz del repo>/material/fotos        (fotos del restaurante)
 *          <raíz del repo>/material/fotos-stock  (fotos de stock provisionales; docs/creditos-fotos.md)
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
const stockDir = join(repoRoot, 'material', 'fotos-stock');
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

/**
 * Fotos de stock provisionales (Pexels) hasta que lleguen las fotos profesionales del restaurante.
 * Salida con prefijo `stock-` para localizarlas y retirarlas fácilmente.
 * `aspect` (ancho/alto) recorta la foto al centro con esa proporción; `maxWidth` (por defecto 1280)
 * limita el ancho mayor: solo la portada necesita 1920.
 */
const STOCK_PHOTOS: Record<string, { name: string; aspect?: number; maxWidth?: number }> = {
  'festin-peruano.jpg': { name: 'stock-festin-peruano', aspect: 3 / 2, maxWidth: 1920 },
  'ceviche.jpg': { name: 'stock-ceviche' },
  'lomo-saltado.jpg': { name: 'stock-lomo-saltado' },
  'causa-rellena.jpg': { name: 'stock-causa-rellena' },
  'causa-langostinos.jpg': { name: 'stock-causa-langostinos' },
  'tamales.jpg': { name: 'stock-tamales' },
  'empanadas-stock.jpg': { name: 'stock-empanadas' },
  'jalea-mixta.jpg': { name: 'stock-jalea-mixta' },
  'ensalada-quinua-stock.jpg': { name: 'stock-ensalada-quinua' },
  'papa-huancaina.jpg': { name: 'stock-papa-huancaina' },
  'maiz-morado.jpg': { name: 'stock-maiz-morado' },
  'mercado-andino.jpg': { name: 'stock-mercado-andino' },
};

async function optimizePhoto(
  input: string,
  baseName: string,
  aspect?: number,
  maxWidth = 1920,
): Promise<string[]> {
  // rotate() aplica la orientación EXIF y después la descarta; no se llama a withMetadata(),
  // así que sharp no escribe EXIF, XMP, ICC ni GPS en el resultado.
  const meta = await sharp(input).rotate().metadata();
  if (meta.width === undefined || meta.height === undefined) {
    throw new Error(`No se pudo leer el tamaño de ${input}`);
  }
  // Tamaño útil tras el recorte opcional a la proporción pedida.
  const area =
    aspect === undefined
      ? { width: meta.width, height: meta.height }
      : meta.width / meta.height > aspect
        ? { width: Math.round(meta.height * aspect), height: meta.height }
        : { width: meta.width, height: Math.round(meta.width / aspect) };

  const written: string[] = [];
  for (const target of WIDTHS) {
    if (target > area.width || target > maxWidth) continue;
    const outFile = join(outputDir, `${baseName}-${target}.webp`);
    await sharp(input)
      .rotate()
      .resize({
        width: target,
        ...(aspect !== undefined && {
          height: Math.round((target * area.height) / area.width),
          fit: 'cover' as const,
        }),
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toFile(outFile);

    const check = await sharp(outFile).metadata();
    if (check.exif !== undefined) throw new Error(`Quedan metadatos EXIF en ${outFile}`);
    written.push(`${baseName}-${target}.webp (${check.width}x${check.height})`);
  }
  return written;
}

async function main(): Promise<void> {
  for (const dir of [sourceDir, stockDir]) {
    if (!existsSync(dir)) throw new Error(`No existe la carpeta de origen: ${dir}`);
  }
  const present = new Set(await readdir(sourceDir));
  const missing = Object.keys(PHOTO_NAMES).filter((name) => !present.has(name));
  const presentStock = new Set(await readdir(stockDir));
  missing.push(...Object.keys(STOCK_PHOTOS).filter((name) => !presentStock.has(name)));
  if (missing.length > 0) throw new Error(`Faltan fotos de origen: ${missing.join(', ')}`);

  await mkdir(outputDir, { recursive: true });
  for (const [sourceFile, baseName] of Object.entries(PHOTO_NAMES)) {
    const files = await optimizePhoto(join(sourceDir, sourceFile), baseName);
    for (const line of files) console.log(`ok  ${line}  <-  ${sourceFile}`);
  }
  for (const [sourceFile, { name, aspect, maxWidth = 1280 }] of Object.entries(STOCK_PHOTOS)) {
    const files = await optimizePhoto(join(stockDir, sourceFile), name, aspect, maxWidth);
    for (const line of files) console.log(`ok  ${line}  <-  fotos-stock/${sourceFile}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
