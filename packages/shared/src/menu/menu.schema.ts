import { z } from 'zod';
import { ALLERGEN_CODES } from './allergens';

export const MENU_STATUSES = ['visible', 'hidden', 'archived'] as const;
export type MenuStatus = (typeof MENU_STATUSES)[number];

export const DIETS = ['vegan', 'vegetarian'] as const;
export type Diet = (typeof DIETS)[number];

const REQUIRED = { error: 'validation.required' };
const TOO_LONG = { error: 'validation.tooLong' };

/** Precio: número o texto con coma/punto ("12,90") → número con hasta 2 decimales, 0–999,99. */
export const priceSchema = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const text = typeof value === 'string' ? value.trim().replace(',', '.') : String(value);
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) {
    ctx.issues.push({ code: 'custom', message: 'validation.price', input: value });
    return z.NEVER;
  }
  return Number(text);
});

const requiredName = (max: number) =>
  z.string({ error: 'validation.required' }).trim().min(1, REQUIRED).max(max, TOO_LONG);

/** Texto opcional: '' (o solo espacios) pasa a null; undefined se conserva (updates parciales). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, TOO_LONG)
    .nullish()
    .transform((v) => (v === '' ? null : v));

const altText = z.string().trim().min(1, REQUIRED).max(200, TOO_LONG);

const allergensSchema = z
  .array(z.enum(ALLERGEN_CODES, { error: 'validation.allergen' }))
  .transform((codes) => [...new Set(codes)].sort());

const visibleOrHidden = z.enum(['visible', 'hidden']);

export const categoryInputSchema = z.object({
  nameDe: requiredName(80),
  nameEs: requiredName(80),
  descriptionDe: optionalText(500),
  descriptionEs: optionalText(500),
  status: visibleOrHidden,
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema
  .partial()
  .extend({ status: z.enum(MENU_STATUSES).optional() });
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

export const dishInputSchema = z.object({
  categoryId: z.number({ error: 'validation.required' }).int().positive(),
  nameDe: requiredName(120),
  nameEs: requiredName(120),
  descriptionDe: optionalText(1000),
  descriptionEs: optionalText(1000),
  price: priceSchema,
  diet: z.enum(DIETS).nullable(),
  allergens: allergensSchema,
  status: visibleOrHidden,
  isProvisional: z.boolean(),
  provisionalNote: optionalText(300),
});
export type DishInput = z.infer<typeof dishInputSchema>;

export const dishUpdateSchema = dishInputSchema.partial().extend({
  status: z.enum(MENU_STATUSES).optional(),
  imageAltDe: altText.optional(),
  imageAltEs: altText.optional(),
});
export type DishUpdate = z.infer<typeof dishUpdateSchema>;

export const imageAltSchema = z.object({ altDe: altText, altEs: altText });
export type ImageAltInput = z.infer<typeof imageAltSchema>;

export const reorderSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

/* ---------- Respuestas de la API (las fechas viajan como texto ISO en JSON) ---------- */

const timestamps = { createdAt: z.string(), updatedAt: z.string() };
const imageUrls = z.object({ w400: z.string(), w800: z.string(), w1600: z.string() });
const nullableText = z.string().nullable();

export const adminCategorySchema = z.object({
  id: z.number().int(),
  nameDe: z.string(),
  nameEs: z.string(),
  descriptionDe: nullableText,
  descriptionEs: nullableText,
  sortOrder: z.number().int(),
  status: z.enum(MENU_STATUSES),
  dishCount: z.number().int(),
  ...timestamps,
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;

export const adminDishSchema = z.object({
  id: z.number().int(),
  categoryId: z.number().int(),
  nameDe: z.string(),
  nameEs: z.string(),
  descriptionDe: nullableText,
  descriptionEs: nullableText,
  price: z.number(),
  diet: z.enum(DIETS).nullable(),
  allergens: z.array(z.enum(ALLERGEN_CODES)),
  imageUrl: imageUrls.nullable(),
  imageAltDe: nullableText,
  imageAltEs: nullableText,
  sortOrder: z.number().int(),
  status: z.enum(MENU_STATUSES),
  isProvisional: z.boolean(),
  provisionalNote: nullableText,
  ...timestamps,
});
export type AdminDish = z.infer<typeof adminDishSchema>;

/** Carta pública: sin estado, provisional ni notas internas (z.object elimina claves extra). */
export const publicMenuSchema = z.object({
  categories: z.array(
    z.object({
      id: z.number().int(),
      nameDe: z.string(),
      nameEs: z.string(),
      descriptionDe: nullableText,
      descriptionEs: nullableText,
      dishes: z.array(
        z.object({
          id: z.number().int(),
          nameDe: z.string(),
          nameEs: z.string(),
          descriptionDe: nullableText,
          descriptionEs: nullableText,
          price: z.number(),
          diet: z.enum(DIETS).nullable(),
          allergens: z.array(z.enum(ALLERGEN_CODES)),
          image: z.object({ url: imageUrls, altDe: z.string(), altEs: z.string() }).nullable(),
        }),
      ),
    }),
  ),
});
export type PublicMenu = z.infer<typeof publicMenuSchema>;

export const menuSummarySchema = z.object({
  visibleDishes: z.number().int(),
  hiddenDishes: z.number().int(),
  provisionalDishes: z.number().int(),
  dishesWithoutImage: z.number().int(),
  categories: z.number().int(),
});
export type MenuSummary = z.infer<typeof menuSummarySchema>;
