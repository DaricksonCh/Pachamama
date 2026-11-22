/** Enlace a la carta en PDF (la genera la API) en el idioma indicado. */
export function menuPdfUrl(language: string) {
  return `/api/v1/menu/pdf?lang=${encodeURIComponent(language)}`;
}
