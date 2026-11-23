import type { PublicMenu } from '@pachamama/shared';
import { describe, expect, it } from 'vitest';
import {
  BAND_TONES,
  bandTone,
  COMPACT_DESCRIPTION_MAX,
  isCompactCategory,
  readProgress,
} from './menu-bands';

type Category = PublicMenu['categories'][number];
type Dish = Category['dishes'][number];

const dish = (overrides: Partial<Dish> = {}): Dish => ({
  id: 1,
  nameDe: 'Reis',
  nameEs: 'Arroz',
  descriptionDe: 'Reis.',
  descriptionEs: 'Arroz.',
  price: 3,
  diet: null,
  allergens: [],
  image: null,
  ...overrides,
});

const category = (dishes: Dish[]): Category => ({
  id: 1,
  nameDe: 'Beilagen',
  nameEs: 'Guarniciones',
  descriptionDe: null,
  descriptionEs: null,
  dishes,
});

describe('bandTone', () => {
  it('gives each category the next colour of the manta and starts again after the last', () => {
    expect(bandTone(0)).toBe(BAND_TONES[0]);
    expect(bandTone(1)).toBe(BAND_TONES[1]);
    expect(bandTone(BAND_TONES.length)).toBe(BAND_TONES[0]);
    expect(bandTone(BAND_TONES.length + 2)).toBe(BAND_TONES[2]);
  });

  it('uses dark ink only on the maize band', () => {
    const darkInk = BAND_TONES.filter((tone) => tone.ink.includes('tierra'));
    expect(darkInk.map((tone) => tone.band)).toEqual(['var(--color-maiz)']);
  });
});

describe('isCompactCategory', () => {
  it('is compact when no dish has a photo and every description is short', () => {
    expect(isCompactCategory(category([dish(), dish({ descriptionDe: null })]))).toBe(true);
  });

  it('is not compact when a dish has a photo', () => {
    const image = {
      url: { w400: '/a-400.webp', w800: '/a-800.webp', w1600: '/a-1600.webp' },
      altDe: 'Reis',
      altEs: 'Arroz',
    };
    expect(isCompactCategory(category([dish(), dish({ image })]))).toBe(false);
  });

  it('is not compact when a description is long in either language', () => {
    const long = 'x'.repeat(COMPACT_DESCRIPTION_MAX + 1);
    const exact = 'x'.repeat(COMPACT_DESCRIPTION_MAX);
    expect(isCompactCategory(category([dish({ descriptionDe: exact })]))).toBe(true);
    expect(isCompactCategory(category([dish({ descriptionEs: long })]))).toBe(false);
  });
});

describe('readProgress', () => {
  it('is 0 before the section reaches the reading line and 1 once it is past', () => {
    expect(readProgress(500, 1000, 400)).toBe(0);
    expect(readProgress(-700, 1000, 400)).toBe(1);
  });

  it('grows with the part of the section above the reading line', () => {
    expect(readProgress(0, 1000, 400)).toBeCloseTo(0.4);
    expect(readProgress(-100, 1000, 400)).toBeCloseTo(0.5);
  });

  it('handles empty sections without dividing by zero', () => {
    expect(readProgress(100, 0, 400)).toBe(1);
    expect(readProgress(500, 0, 400)).toBe(0);
  });
});
