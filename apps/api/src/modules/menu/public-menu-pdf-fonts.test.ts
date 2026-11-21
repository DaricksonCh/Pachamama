import { extractText } from 'unpdf';
import { describe, expect, it } from 'vitest';
import { renderMenuPdf } from './pdf/menu-pdf';

/**
 * Archivo aparte a propósito: el fallo solo aparece con el estado de fuentes de un proceso
 * nuevo (Vitest aísla los módulos por archivo). Sin `renderWithFreshFonts`, un glifo compuesto
 * (Ö de "ÖFFNUNGSZEITEN" en el PDF alemán) estropeaba H y O en el PDF siguiente.
 */
const menu = {
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
          nameDe: 'Ocopa',
          nameEs: 'Ocopa',
          descriptionDe: 'Öl, Huacatay',
          descriptionEs: 'Aceite, huacatay',
          price: 8,
          diet: 'vegetarian' as const,
          allergens: ['G' as const],
          image: null,
        },
      ],
    },
  ],
};

const compactText = async (pdf: Buffer) =>
  (await extractText(new Uint8Array(pdf), { mergePages: true })).text.replace(/\s/g, '');

describe('renderMenuPdf: varios PDF en el mismo proceso', () => {
  it('el PDF en español generado después del alemán conserva todos los glifos', async () => {
    const de = await renderMenuPdf({ menu, lang: 'de' });
    expect(await compactText(de)).toContain('ÖFFNUNGSZEITEN');
    const es = await renderMenuPdf({ menu, lang: 'es' });
    const text = await compactText(es);
    expect(text).toContain('HORARIO');
    expect(text).toContain('VEGETARIANO');
    expect(text).toContain('Ocopa');
  });
});
