import type { Diet, Language } from '@pachamama/shared';

type PdfLabels = {
  documentTitle: string;
  menuTitle: string;
  tagline: string;
  diet: Record<Diet, string>;
  allergensTitle: string;
  dietTitle: string;
  lmivNotice: string;
  pricesNotice: string;
  addressTitle: string;
  hoursTitle: string;
  emptyMenu: string;
  page: string;
  fileName: string;
};

/** Textos fijos del PDF por idioma (el resto sale de la BD y de packages/shared). */
export const pdfLabels: Record<Language, PdfLabels> = {
  de: {
    documentTitle: 'Pachamama – Speisekarte',
    menuTitle: 'Speisekarte',
    tagline: 'Hausgemacht & traditionell',
    diet: { vegan: 'vegan', vegetarian: 'vegetarisch' },
    allergensTitle: 'Allergene',
    dietTitle: 'Kennzeichnung',
    lmivNotice:
      'Allergenkennzeichnung gemäß Lebensmittelinformationsverordnung (EU) Nr. 1169/2011. ' +
      'Die Buchstaben neben den Gerichten verweisen auf die enthaltenen Allergene. ' +
      'Spuren weiterer Allergene können wir nicht ausschließen. ' +
      'Bei Fragen zu Zutaten hilft Ihnen unser Team gerne weiter.',
    pricesNotice: 'Alle Preise in Euro inkl. gesetzlicher MwSt. Bezahlung im Restaurant.',
    addressTitle: 'Adresse',
    hoursTitle: 'Öffnungszeiten',
    emptyMenu: 'Unsere Speisekarte wird gerade aktualisiert.',
    page: 'Seite',
    fileName: 'pachamama-karte-de.pdf',
  },
  es: {
    documentTitle: 'Pachamama – Carta',
    menuTitle: 'Carta',
    tagline: 'Casero y tradicional',
    diet: { vegan: 'vegano', vegetarian: 'vegetariano' },
    allergensTitle: 'Alérgenos',
    dietTitle: 'Distintivos',
    lmivNotice:
      'Información sobre alérgenos conforme al Reglamento (UE) n.º 1169/2011. ' +
      'Las letras junto a cada plato indican los alérgenos que contiene. ' +
      'No podemos descartar trazas de otros alérgenos. ' +
      'Si tiene preguntas sobre los ingredientes, nuestro equipo le atenderá con gusto.',
    pricesNotice: 'Precios en euros, IVA incluido. Pago en el local.',
    addressTitle: 'Dirección',
    hoursTitle: 'Horario',
    emptyMenu: 'Estamos actualizando nuestra carta.',
    page: 'Página',
    fileName: 'pachamama-carta-es.pdf',
  },
};

/** Espacio no separable: el precio nunca se parte en dos líneas. */
const NBSP = String.fromCharCode(0xa0);

/** 13 → "13,00 €". */
export function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')}${NBSP}€`;
}
