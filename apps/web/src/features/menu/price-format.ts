import type { Language } from '@pachamama/shared';

const priceFormats = new Map<Language, Intl.NumberFormat>();

/** Formats a menu price in euros for the page language; one formatter per language. */
export function formatPrice(lang: Language, price: number) {
  let format = priceFormats.get(lang);
  if (!format) {
    format = new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'es-ES', {
      style: 'currency',
      currency: 'EUR',
    });
    priceFormats.set(lang, format);
  }
  return format.format(price);
}
