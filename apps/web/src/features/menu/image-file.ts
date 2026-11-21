/** Formatos que acepta la API (el servidor los vuelve a comprobar por contenido). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Comprobación previa en el navegador: devuelve la clave i18n del error o `null`. */
export function checkImageFile(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return 'validation.imageType';
  if (file.size > MAX_IMAGE_BYTES) return 'validation.imageTooLarge';
  return null;
}
