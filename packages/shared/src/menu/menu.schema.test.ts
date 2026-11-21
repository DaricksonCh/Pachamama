import { describe, expect, it } from 'vitest';
import {
  categoryInputSchema,
  dishInputSchema,
  dishUpdateSchema,
  priceSchema,
  publicMenuSchema,
  reorderSchema,
  RESTAURANT_INFO,
} from '../index';

const validDish = {
  categoryId: 1,
  nameDe: 'Ceviche',
  nameEs: 'Ceviche',
  price: '12,90',
  diet: null,
  allergens: [],
  status: 'visible',
  isProvisional: false,
};

describe('priceSchema', () => {
  it('parses numbers and strings with comma or dot', () => {
    expect(priceSchema.parse('12,90')).toBe(12.9);
    expect(priceSchema.parse('8.5')).toBe(8.5);
    expect(priceSchema.parse(0)).toBe(0);
  });

  it.each(['-1', '1000', 'abc', '12,999', ''])('rejects %j', (value) => {
    const result = priceSchema.safeParse(value);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('validation.price');
  });
});

describe('dishInputSchema', () => {
  it('accepts a valid dish', () => {
    expect(dishInputSchema.parse(validDish).price).toBe(12.9);
  });

  it.each(['nameDe', 'nameEs', 'categoryId', 'price'])('requires %s', (field) => {
    const { [field]: _omit, ...rest } = validDish as Record<string, unknown>;
    const result = dishInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual([field]);
  });

  it('turns empty descriptions into null', () => {
    const parsed = dishInputSchema.parse({ ...validDish, descriptionDe: '', descriptionEs: '  ' });
    expect(parsed.descriptionDe).toBeNull();
    expect(parsed.descriptionEs).toBeNull();
  });

  it('rejects an unknown allergen', () => {
    expect(dishInputSchema.safeParse({ ...validDish, allergens: ['R'] }).success).toBe(false);
  });

  it('dedupes and sorts allergens', () => {
    expect(dishInputSchema.parse({ ...validDish, allergens: ['C', 'A', 'A'] }).allergens).toEqual([
      'A',
      'C',
    ]);
  });
});

describe('dishUpdateSchema', () => {
  it('accepts archiving and partial updates', () => {
    expect(dishUpdateSchema.parse({ status: 'archived' })).toEqual({ status: 'archived' });
  });
});

describe('categoryInputSchema', () => {
  it('rejects archived status', () => {
    expect(
      categoryInputSchema.safeParse({ nameDe: 'A', nameEs: 'B', status: 'archived' }).success,
    ).toBe(false);
  });
});

describe('reorderSchema', () => {
  it('rejects duplicate and empty ids', () => {
    expect(reorderSchema.safeParse({ ids: [1, 1] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: [2, 1] }).success).toBe(true);
  });
});

describe('publicMenuSchema', () => {
  it('strips provisional fields and keeps the image shape', () => {
    const parsed = publicMenuSchema.parse({
      categories: [
        {
          id: 1,
          nameDe: 'Vorspeisen',
          nameEs: 'Entradas',
          descriptionDe: null,
          descriptionEs: null,
          dishes: [
            {
              id: 1,
              nameDe: 'Ceviche',
              nameEs: 'Ceviche',
              descriptionDe: null,
              descriptionEs: null,
              price: 12.9,
              diet: null,
              allergens: ['D'],
              image: null,
              isProvisional: true,
              provisionalNote: 'x',
            },
          ],
        },
      ],
    });
    const dish = parsed.categories[0]?.dishes[0];
    expect(dish).not.toHaveProperty('isProvisional');
    expect(dish).not.toHaveProperty('provisionalNote');
  });
});

describe('RESTAURANT_INFO', () => {
  it('has the provisional address', () => {
    expect(RESTAURANT_INFO.address.city).toBe('Bremen');
    expect(RESTAURANT_INFO.isProvisional).toBe(true);
  });
});
