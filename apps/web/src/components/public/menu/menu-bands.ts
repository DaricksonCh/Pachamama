import type { PublicMenu } from '@pachamama/shared';

type Category = PublicMenu['categories'][number];

/**
 * Colours of the manta for the menu bands (ADR 0016). Each category takes the next band in turn,
 * so new categories from /admin get a colour without touching the code.
 * `ink` keeps AA contrast on the band; `accent` draws the woven diamonds.
 */
export const BAND_TONES = [
  { band: 'var(--color-aji-deep)', ink: 'var(--color-papel)', accent: 'var(--color-maiz)' },
  { band: 'var(--color-maiz)', ink: 'var(--color-tierra)', accent: 'var(--color-aji)' },
  { band: 'var(--color-chicha)', ink: 'var(--color-papel)', accent: 'var(--color-maiz)' },
  { band: 'var(--color-selva)', ink: 'var(--color-papel)', accent: 'var(--color-maiz)' },
] as const;

export type BandTone = (typeof BAND_TONES)[number];

export const bandTone = (index: number): BandTone => BAND_TONES[index % BAND_TONES.length]!;

/** Id of a category section (link target of the sticky bar). */
export const categoryAnchor = (id: number) => `category-${id}`;

/** Longest description that still fits the compact grid (sides, dips…). */
export const COMPACT_DESCRIPTION_MAX = 90;

/**
 * Small categories (sides, dips) read better as a dense grid: no photos and only short
 * descriptions in both languages.
 */
export function isCompactCategory(category: Category): boolean {
  return category.dishes.every(
    (dish) =>
      dish.image === null &&
      (dish.descriptionDe ?? '').length <= COMPACT_DESCRIPTION_MAX &&
      (dish.descriptionEs ?? '').length <= COMPACT_DESCRIPTION_MAX,
  );
}

/** Share of a section already read: 0 before its top reaches the reading line, 1 once past it. */
export function readProgress(top: number, height: number, readingLine: number): number {
  if (height <= 0) return top <= readingLine ? 1 : 0;
  return Math.min(1, Math.max(0, (readingLine - top) / height));
}
