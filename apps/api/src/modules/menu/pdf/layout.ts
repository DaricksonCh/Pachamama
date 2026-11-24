import type { PublicMenu } from '@pachamama/shared';
import { colors } from './pdf-theme';

type Category = PublicMenu['categories'][number];

/**
 * Colores de la manta por categoría, en turno, como las bandas de la web (ADR 0016):
 * `band` tiñe la cinta de las fotos y el precio; `ink` es el texto que va encima con contraste AA.
 */
export const PDF_TONES = [
  { band: colors.ajiDeep, ink: colors.paper },
  { band: colors.maiz, ink: colors.text },
  { band: colors.chicha, ink: colors.paper },
  { band: colors.selva, ink: colors.paper },
] as const;

export type PdfTone = (typeof PDF_TONES)[number];

export const toneFor = (index: number): PdfTone => PDF_TONES[index % PDF_TONES.length]!;

/**
 * Color legible sobre papel para textos del tono (el maíz no llega a AA sobre papel:
 * se usa ají oscuro en su lugar).
 */
export const textColorFor = (tone: PdfTone): string =>
  tone.band === colors.maiz ? colors.ajiDeep : tone.band;

/** Descripción más larga que aún cabe en la rejilla de tres columnas. */
export const COMPACT_DESCRIPTION_MAX = 90;

/** Categorías cortas (guarniciones, salsas): todas las descripciones breves → 3 columnas. */
export function columnsFor(category: Category): 2 | 3 {
  const short = category.dishes.every(
    (d) =>
      (d.descriptionDe ?? '').length <= COMPACT_DESCRIPTION_MAX &&
      (d.descriptionEs ?? '').length <= COMPACT_DESCRIPTION_MAX,
  );
  return short ? 3 : 2;
}

/** Reparte en filas de `size` elementos (la última puede quedar incompleta). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}
