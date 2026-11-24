import type { PublicMenu } from '@pachamama/shared';
import { describe, expect, it } from 'vitest';
import {
  chunk,
  columnsFor,
  COMPACT_DESCRIPTION_MAX,
  PDF_TONES,
  textColorFor,
  toneFor,
} from './layout';
import { colors } from './pdf-theme';

type Category = PublicMenu['categories'][number];
type Dish = Category['dishes'][number];

const dish = (
  descriptionDe: string | null,
  descriptionEs: string | null = descriptionDe,
): Dish => ({
  id: 1,
  nameDe: 'Arroz',
  nameEs: 'Arroz',
  descriptionDe,
  descriptionEs,
  price: 3,
  diet: null,
  allergens: [],
  image: null,
});

const category = (dishes: Dish[]): Category => ({
  id: 1,
  nameDe: 'Beilagen',
  nameEs: 'Guarniciones',
  descriptionDe: null,
  descriptionEs: null,
  dishes,
});

describe('toneFor', () => {
  it('reparte los colores de la manta por turnos', () => {
    expect(toneFor(0)).toBe(PDF_TONES[0]);
    expect(toneFor(3)).toBe(PDF_TONES[3]);
    expect(toneFor(4)).toBe(PDF_TONES[0]);
    expect(toneFor(9)).toBe(PDF_TONES[1]);
  });
});

describe('textColorFor', () => {
  it('sustituye el maíz (sin contraste sobre papel) por ají oscuro', () => {
    expect(textColorFor(PDF_TONES[1])).toBe(colors.ajiDeep);
    expect(textColorFor(PDF_TONES[2])).toBe(colors.chicha);
  });
});

describe('columnsFor', () => {
  it('3 columnas si todas las descripciones son cortas (o faltan)', () => {
    expect(columnsFor(category([dish('Reis.'), dish(null)]))).toBe(3);
    expect(columnsFor(category([dish('x'.repeat(COMPACT_DESCRIPTION_MAX))]))).toBe(3);
  });

  it('2 columnas si alguna descripción es larga, en cualquiera de los dos idiomas', () => {
    const long = 'x'.repeat(COMPACT_DESCRIPTION_MAX + 1);
    expect(columnsFor(category([dish('Reis.'), dish(long)]))).toBe(2);
    expect(columnsFor(category([dish('Reis.', long)]))).toBe(2);
  });
});

describe('chunk', () => {
  it('reparte en filas y deja la última incompleta', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
