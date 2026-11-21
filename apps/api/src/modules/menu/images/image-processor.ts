import sharp, { type Metadata } from 'sharp';
import { AppError } from '../../../lib/app-error';

export const IMAGE_WIDTHS = [400, 800, 1600] as const;
/** Tope de píxeles de entrada (anti "decompression bomb"): 40 MP. */
export const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

const unsupported = () => new AppError(415, 'UNSUPPORTED_IMAGE', 'Unsupported or corrupt image');

const tooLarge = () => new AppError(413, 'IMAGE_TOO_LARGE', 'Image dimensions too large');
const isPixelLimit = (err: unknown) => err instanceof Error && /pixel limit/i.test(err.message);

/**
 * Convierte una foto subida a WebP en varios anchos.
 * - Solo JPEG, PNG y WebP (no SVG, GIF, TIFF, HEIF…); otro formato → 415.
 * - Más de 40 MP → 413 IMAGE_TOO_LARGE (es un problema de tamaño, no de formato).
 * - `rotate()` aplica la orientación EXIF y, al no usar `withMetadata`, el resultado no conserva EXIF/GPS.
 * - Los anchos se generan de uno en uno para no multiplicar la memoria de la decodificación.
 */
export async function processDishImage(input: Buffer): Promise<{ width: number; data: Buffer }[]> {
  const options = { limitInputPixels: MAX_INPUT_PIXELS };
  let meta: Metadata;
  try {
    meta = await sharp(input, options).metadata();
  } catch (err) {
    throw isPixelLimit(err) ? tooLarge() : unsupported();
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw unsupported();
  if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_INPUT_PIXELS) {
    throw tooLarge();
  }

  const variants: { width: number; data: Buffer }[] = [];
  try {
    for (const width of IMAGE_WIDTHS) {
      const data = await sharp(input, options)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      variants.push({ width, data });
    }
  } catch (err) {
    throw isPixelLimit(err) ? tooLarge() : unsupported();
  }
  return variants;
}
