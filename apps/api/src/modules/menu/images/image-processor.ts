import sharp from 'sharp';
import { AppError } from '../../../lib/app-error';

export const IMAGE_WIDTHS = [400, 800, 1600] as const;

/**
 * Convierte una foto subida a WebP en varios anchos.
 * `rotate()` aplica la orientación EXIF y, al no usar `withMetadata`, el resultado
 * no conserva EXIF/GPS (privacidad). Si no se puede decodificar → 415.
 */
export async function processDishImage(input: Buffer): Promise<{ width: number; data: Buffer }[]> {
  try {
    const base = sharp(input, { failOn: 'error' }).rotate();
    return await Promise.all(
      IMAGE_WIDTHS.map(async (width) => ({
        width,
        data: await base
          .clone()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      })),
    );
  } catch {
    throw new AppError(415, 'UNSUPPORTED_IMAGE', 'Unsupported or corrupt image');
  }
}
