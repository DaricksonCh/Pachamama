/**
 * Carga inicial de la carta: los platos del PDF del restaurante (`material/menu/menu.pdf`).
 * - Textos alemanes del PDF con las erratas evidentes corregidas; español traducido (revisar:
 *   ver docs/pendientes.md). Los textos en inglés del PDF se descartan.
 * - Alérgenos por letra (A–N). La "R" del PDF no existe y se descarta.
 * - Dudas (precios ambiguos, alérgenos que faltan, erratas interpretadas): el plato se carga
 *   visible con el valor más probable, `isProvisional` y la duda en `provisionalNote`
 *   (se corrigen desde el panel). Cada duda está también en docs/pendientes.md.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { categoryInputSchema, dishInputSchema } from '@pachamama/shared';
import type { z } from 'zod';
import type { MenuService } from '../../src/modules/menu/menu.service';

/** Lo que recibe el formulario del panel (`z.input`): se valida con los mismos schemas al cargar. */
export type SeedDish = Omit<z.input<typeof dishInputSchema>, 'categoryId'>;
export type SeedGroup = { category: z.input<typeof categoryInputSchema>; dishes: SeedDish[] };

const NO_ALLERGENS = 'El PDF no indica alérgenos: confirmar con el restaurante.';
const ALLERGEN_R = 'El PDF indica el alérgeno "R", que no existe (A–N): descartado.';

/** Plato visible; si lleva notas, es provisional. */
function dish(
  fields: Omit<SeedDish, 'status' | 'isProvisional' | 'provisionalNote' | 'diet'> & {
    diet?: SeedDish['diet'];
  },
  ...notes: string[]
): SeedDish {
  return {
    diet: null,
    ...fields,
    status: 'visible',
    isProvisional: notes.length > 0,
    provisionalNote: notes.length > 0 ? notes.join(' ') : null,
  };
}

const visible = 'visible' as const;

export const MENU_SEED: SeedGroup[] = [
  {
    category: { nameDe: 'Vorspeisen', nameEs: 'Entrantes', status: visible },
    dishes: [
      dish({
        nameDe: 'Papa rellena',
        nameEs: 'Papa rellena',
        descriptionDe:
          'Gefüllte und frittierte Kartoffelmasse mit Rinderhackfleisch, Ei, Olive und Sarsa Criolla.',
        descriptionEs:
          'Masa de papa rellena y frita con carne picada de res, huevo, aceituna y sarsa criolla.',
        price: 8.5,
        allergens: ['A', 'C', 'G'],
      }),
      dish(
        {
          nameDe: 'Papa rellena vegan',
          nameEs: 'Papa rellena vegana',
          descriptionDe:
            'Gefüllte und frittierte Kartoffelmasse mit Gemüse und Champignons, Olive und Sarsa Criolla.',
          descriptionEs:
            'Masa de papa rellena y frita con verduras y champiñones, aceituna y sarsa criolla.',
          price: 8.5,
          diet: 'vegan',
          allergens: ['A'],
        },
        'El PDF muestra dos precios (8,50 € y 8,00 €): se usa 8,50 €, el que va junto al nombre.',
      ),
      dish(
        {
          nameDe: 'Tamal de Pollo',
          nameEs: 'Tamal de pollo',
          descriptionDe:
            'Maisteig gefüllt mit Hähnchenstücken, eingewickelt in Bananenblätter, mit gekochtem Ei, dazu Sarsa Criolla.',
          descriptionEs:
            'Masa de maíz rellena de trozos de pollo, envuelta en hojas de plátano, con huevo duro y sarsa criolla.',
          price: 8,
          allergens: ['C'],
        },
        'Sin precio claro en el PDF: se usa 8,00 € (el precio suelto junto a la Papa rellena vegan).',
      ),
      dish(
        {
          nameDe: 'Tamal vegan',
          nameEs: 'Tamal vegano',
          descriptionDe:
            'Maisteig gefüllt mit Gemüse und Champignons, eingewickelt in Bananenblätter, dazu Sarsa Criolla.',
          descriptionEs:
            'Masa de maíz rellena de verduras y champiñones, envuelta en hojas de plátano, con sarsa criolla.',
          price: 8,
          diet: 'vegan',
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish({
        nameDe: 'Causa Limeña',
        nameEs: 'Causa limeña',
        descriptionDe:
          'Kartoffelteig gewürzt mit gelbem Chili, fein gezupfter Hähnchenbrust, Sellerie, Ei, Avocado und Mayo.',
        descriptionEs:
          'Masa de papa sazonada con ají amarillo, pechuga de pollo deshilachada, apio, huevo, palta y mayonesa.',
        price: 10.9,
        allergens: ['C', 'I'],
      }),
      dish(
        {
          nameDe: 'Causa veggie',
          nameEs: 'Causa vegetariana',
          descriptionDe:
            'Kartoffelteig gewürzt mit gelbem Chili, Paprika, Mais, Tomate, Zwiebel, Ei, Avocado und Mayo.',
          descriptionEs:
            'Masa de papa sazonada con ají amarillo, pimiento, maíz, tomate, cebolla, huevo, palta y mayonesa.',
          price: 10.9,
          diet: 'vegetarian',
          allergens: [],
        },
        NO_ALLERGENS,
        'Lleva huevo y mayonesa (¿C?).',
      ),
      dish(
        {
          nameDe: 'Causa Acevichada',
          nameEs: 'Causa acevichada',
          descriptionDe:
            'Kartoffelteig gewürzt mit gelbem Chili, Avocado, Mayo und Ceviche (mit Fisch).',
          descriptionEs:
            'Masa de papa sazonada con ají amarillo, palta, mayonesa y ceviche (con pescado).',
          price: 13,
          allergens: ['D', 'G', 'I'],
        },
        'El PDF muestra dos precios (13,00 € y 10,00 €): se usa 13,00 €, el que va junto al nombre.',
      ),
      dish(
        {
          nameDe: 'Tiradito',
          nameEs: 'Tiradito',
          descriptionDe:
            'In Scheiben geschnittenes Viktoriabarschfilet mit Limettensaft, gelber Chilicreme, Choclo und Süßkartoffeln.',
          descriptionEs:
            'Filete de perca del Nilo en láminas con jugo de lima, crema de ají amarillo, choclo y camote.',
          price: 13,
          allergens: ['D', 'G'],
        },
        'Sin precio en el PDF: 13,00 € provisional, como los demás entrantes de pescado (decidido el 2026-11-21).',
      ),
      dish(
        {
          nameDe: 'Leche de Tigre',
          nameEs: 'Leche de tigre',
          descriptionDe:
            'Im Glas servierte Fischwürfel mit Limettensaft (Ingwer, Knoblauch, Sellerie), roten Zwiebeln, Ají Limo, Koriander, Choclo (gekochter Mais), Cancha (gerösteter Mais) und Chifles (Bananenchips).',
          descriptionEs:
            'Dados de pescado servidos en vaso con jugo de lima (jengibre, ajo, apio), cebolla morada, ají limo, cilantro, choclo, cancha (maíz tostado) y chifles (chips de plátano).',
          price: 13,
          allergens: ['B', 'D', 'G', 'L'],
        },
        'La descripción lleva apio, pero el PDF no indica I. Confirmar alérgenos.',
      ),
      dish(
        {
          nameDe: 'Ceviche',
          nameEs: 'Ceviche',
          descriptionDe:
            'Marinierte Viktoriabarschfilet-Würfel mit Limettensaft (Ingwer, Knoblauch, Sellerie), Kalmar, Oktopus, Garnelen, Muscheln, roten Zwiebeln, Ají Limo, Koriander, Paprika, Süßkartoffeln oder Kartoffeln, Choclo (gekochter Mais), Cancha (gerösteter Mais) und Chifles (Bananenchips).',
          descriptionEs:
            'Dados de perca del Nilo marinados en jugo de lima (jengibre, ajo, apio) con calamar, pulpo, langostinos, mejillones, cebolla morada, ají limo, cilantro, pimiento, camote o papa, choclo, cancha (maíz tostado) y chifles (chips de plátano).',
          price: 13,
          allergens: ['B', 'D', 'L'],
        },
        'La descripción lleva apio, calamar, pulpo y mejillones, pero el PDF no indica I ni N. Confirmar alérgenos.',
      ),
    ],
  },
  {
    category: { nameDe: 'Suppen & Salate', nameEs: 'Sopas y ensaladas', status: visible },
    dishes: [
      dish({
        nameDe: 'Sopa Huaylina',
        nameEs: 'Sopa huaylina',
        descriptionDe: 'Erbsenmehlsuppe mit Ei und frischem Koriander, dazu gebratene Kartoffeln.',
        descriptionEs:
          'Sopa de harina de arvejas con huevo y cilantro fresco, acompañada de papas doradas.',
        price: 10.9,
        allergens: ['C'],
      }),
      dish({
        nameDe: 'Sopa a la Minuta',
        nameEs: 'Sopa a la minuta',
        descriptionDe:
          'Engelshaarnudelsuppe mit Rinderhackfleisch, rotem Chili, pochiertem Ei, Petersilie und Koriander.',
        descriptionEs:
          'Sopa de fideos cabello de ángel con carne picada de res, ají rojo, huevo escalfado, perejil y cilantro.',
        price: 13,
        allergens: ['A', 'C', 'G'],
      }),
      dish({
        nameDe: 'Solterito',
        nameEs: 'Solterito',
        descriptionDe:
          'Salat aus Südperu mit Saubohnen, Fetakäse, Tomate, Zwiebeln, Mais, Kartoffeln, Olivenöl, Oliven, Essig, Koriander und Petersilie.',
        descriptionEs:
          'Ensalada del sur del Perú con habas, queso feta, tomate, cebolla, maíz, papa, aceite de oliva, aceitunas, vinagre, cilantro y perejil.',
        price: 12.9,
        allergens: ['G'],
      }),
      // En el PDF va en la página de sopas y ensaladas; se respeta (se puede mover en el panel).
      dish({
        nameDe: 'Chicharrón de Calamar',
        nameEs: 'Chicharrón de calamar',
        descriptionDe: 'Knusprig frittierte Tintenfischringe, dazu Aioli.',
        descriptionEs: 'Aros de calamar fritos y crujientes, con alioli.',
        price: 13,
        allergens: ['A', 'C', 'N'],
      }),
    ],
  },
  {
    category: { nameDe: 'Fingerfood', nameEs: 'Fingerfood', status: visible },
    dishes: [
      dish({
        nameDe: 'Tequeños',
        nameEs: 'Tequeños',
        descriptionDe: 'Frittierte, gefüllte Teigtaschen mit Rinderhackfleisch oder Gemüse.',
        descriptionEs: 'Masa frita rellena de carne picada de res o de verduras.',
        price: 10.9,
        allergens: ['A'],
      }),
      dish({
        nameDe: 'Empanadas',
        nameEs: 'Empanadas',
        descriptionDe:
          'Hausgemachte Teigtaschen in drei Sorten: mit Rinderhackfleisch, mit drei Käsesorten oder mit Gemüse.',
        descriptionEs:
          'Empanadas caseras de tres tipos: de carne picada de res, de tres quesos o de verduras.',
        price: 13,
        allergens: ['A', 'C', 'G'],
      }),
      dish(
        {
          nameDe: 'Tostones',
          nameEs: 'Tostones',
          descriptionDe: 'Frittierte Kochbananen mit Pachamama-Soße.',
          descriptionEs: 'Plátano verde frito con salsa Pachamama.',
          price: 8,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Yuca Frita',
          nameEs: 'Yuca frita',
          descriptionDe: 'Frittierter Maniok mit Pachamama-Soße.',
          descriptionEs: 'Yuca frita con salsa Pachamama.',
          price: 8,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
    ],
  },
  {
    category: { nameDe: 'Hauptgerichte', nameEs: 'Platos principales', status: visible },
    dishes: [
      dish(
        {
          nameDe: 'Ceviche de Setas',
          nameEs: 'Ceviche de setas',
          descriptionDe:
            'Saisonale Pilze mit Limettensaft und peruanischem gelbem Chili, Zwiebeln, Paprika, Koriander, Süßkartoffeln oder Kartoffeln, Choclo (gekochter Mais), Cancha (gerösteter Mais) und Chifles.',
          descriptionEs:
            'Setas de temporada con jugo de lima y ají amarillo peruano, cebolla, pimiento, cilantro, camote o papa, choclo, cancha (maíz tostado) y chifles.',
          price: 16.9,
          allergens: [],
        },
        'El PDF dice "Pilsen" (cerveza): se interpreta como "Pilze" (setas).',
        NO_ALLERGENS,
      ),
      dish({
        nameDe: 'Ceviche Clásico',
        nameEs: 'Ceviche clásico',
        descriptionDe:
          'Marinierte Viktoriabarschfilet-Würfel mit Limettensaft (Ingwer, Knoblauch, Sellerie), roten Zwiebeln, Ají Limo, Koriander, Paprika, Süßkartoffeln oder Kartoffeln, Choclo (gekochter Mais), Cancha (gerösteter Mais) und Chifles (Bananenchips).',
        descriptionEs:
          'Dados de perca del Nilo marinados en jugo de lima (jengibre, ajo, apio) con cebolla morada, ají limo, cilantro, pimiento, camote o papa, choclo, cancha (maíz tostado) y chifles (chips de plátano).',
        price: 19.9,
        allergens: ['D', 'G', 'I'],
      }),
      dish({
        nameDe: 'Ceviche Mixto',
        nameEs: 'Ceviche mixto',
        descriptionDe:
          'Marinierte Viktoriabarschfilet-Würfel mit Limettensaft (Ingwer, Knoblauch, Sellerie), Kalmar, Oktopus, Garnelen, Muscheln, roten Zwiebeln, Ají Limo, Koriander, Paprika, Süßkartoffeln oder Kartoffeln, Choclo (gekochter Mais), Cancha (gerösteter Mais) und Chifles (Bananenchips).',
        descriptionEs:
          'Dados de perca del Nilo marinados en jugo de lima (jengibre, ajo, apio) con calamar, pulpo, langostinos, mejillones, cebolla morada, ají limo, cilantro, pimiento, camote o papa, choclo, cancha (maíz tostado) y chifles (chips de plátano).',
        price: 23.9,
        allergens: ['B', 'D', 'G', 'I', 'N'],
      }),
      dish(
        {
          nameDe: 'Arroz Chaufa Vegano',
          nameEs: 'Arroz chaufa vegano',
          descriptionDe:
            'Champignons, im Wok flambiert mit Chinakohl, Gemüse, Frühlingslauch, Sojasauce, Austernsauce, Sesamöl, gebratenem Wantan-Teig und Reis.',
          descriptionEs:
            'Champiñones flambeados al wok con col china, verduras, cebolla china, salsa de soja, salsa de ostión, aceite de sésamo, masa wantán frita y arroz.',
          price: 13.5,
          // Sin etiqueta vegana hasta que el restaurante confirme la receta: lleva salsa de ostión.
          diet: null,
          allergens: ['A', 'F', 'N'],
        },
        ALLERGEN_R,
        'Sin etiqueta vegana: lleva salsa de ostión (N), que no es vegana. Lleva aceite de sésamo (el PDF no indica K).',
      ),
      dish(
        {
          nameDe: 'Arroz Chaufa Vegetarisch',
          nameEs: 'Arroz chaufa vegetariano',
          descriptionDe:
            'Champignons, im Wok flambiert mit Chinakohl, Ei, Gemüse, Frühlingslauch, Sojasauce, Austernsauce, Sesamöl, gebratenem Wantan-Teig und Reis.',
          descriptionEs:
            'Champiñones flambeados al wok con col china, huevo, verduras, cebolla china, salsa de soja, salsa de ostión, aceite de sésamo, masa wantán frita y arroz.',
          price: 15,
          diet: 'vegetarian',
          allergens: ['A', 'F', 'N'],
        },
        ALLERGEN_R,
        'Lleva huevo y aceite de sésamo, pero el PDF no indica C ni K.',
      ),
      dish(
        {
          nameDe: 'Arroz Chaufa Mixto',
          nameEs: 'Arroz chaufa mixto',
          descriptionDe:
            'Rindfleisch- und Hähnchenstücke, im Wok flambiert mit Paprika, Omelett-Stücken, Sojasauce, Austernsauce, Sesamöl, Frühlingslauch, Reis und gebratenem Wantan-Teig.',
          descriptionEs:
            'Trozos de res y pollo flambeados al wok con pimiento, tortilla en trozos, salsa de soja, salsa de ostión, aceite de sésamo, cebolla china, arroz y masa wantán frita.',
          price: 17,
          allergens: ['A', 'C', 'F', 'N'],
        },
        'Lleva aceite de sésamo, pero el PDF no indica K.',
      ),
      dish(
        {
          nameDe: 'Arroz con Pollo',
          nameEs: 'Arroz con pollo',
          descriptionDe:
            'Hähnchenstücke auf grünem Reis (Koriander-Spinat-Sauce) mit Erbsen, Karotten und Choclo, dazu gelbe Sauce und Sarsa Criolla.',
          descriptionEs:
            'Presas de pollo sobre arroz verde (salsa de cilantro y espinaca) con arvejas, zanahoria y choclo, acompañado de salsa amarilla y sarsa criolla.',
          price: 19,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Arroz con Marisco',
          nameEs: 'Arroz con mariscos',
          descriptionDe:
            'Reis in Salsa Madre mit Meeresfrüchte-Mix, Paprika, Erbsen, Choclo und frischem Koriander, dazu Sarsa Criolla Acevichada.',
          descriptionEs:
            'Arroz en salsa madre con mezcla de mariscos, pimiento, arvejas, choclo y cilantro fresco, con sarsa criolla acevichada.',
          price: 21.9,
          allergens: ['B', 'D', 'G', 'I', 'N'],
        },
        'La versión inglesa del PDF dice "chocolate": se interpreta como "choclo".',
      ),
      dish(
        {
          nameDe: 'Seco a la Norteña',
          nameEs: 'Seco a la norteña',
          descriptionDe:
            'Lamm, zubereitet mit Koriander und peruanischen Gewürzen, mit Loche-Kürbis, Reis und Bohnen, dazu Sarsa Criolla.',
          descriptionEs:
            'Cordero guisado con cilantro y especias peruanas, con zapallo loche, arroz y frejoles, acompañado de sarsa criolla.',
          price: 24.9,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Seco a la Limeña',
          nameEs: 'Seco a la limeña',
          descriptionDe:
            'Saftiger, geschmorter peruanischer Rinderbraten aus der Unterschale, dazu Reis mit Bohnen und Sarsa Criolla.',
          descriptionEs:
            'Jugoso guiso peruano de carne de res (cadera), con arroz, frejoles y sarsa criolla.',
          price: 18.5,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Ají de Gallina',
          nameEs: 'Ají de gallina',
          descriptionDe:
            'Fein gezupfte Maishähnchenbrust in einer Sauce aus frischem gelbem Chili, Pekannüssen, Ei und Oliven, mit Kartoffeln und Reis.',
          descriptionEs:
            'Pechuga de pollo de maíz deshilachada en salsa de ají amarillo fresco, pecanas, huevo y aceitunas, con papas y arroz.',
          price: 16,
          allergens: ['A', 'G', 'H'],
        },
        'Lleva huevo, pero el PDF no indica C.',
      ),
      dish(
        {
          nameDe: 'Ají de Champiñones',
          nameEs: 'Ají de champiñones',
          descriptionDe:
            'Saisonale Pilze in einer Sauce aus frischem gelbem Chili, Pekannüssen und Oliven, mit Kartoffeln und Reis.',
          descriptionEs:
            'Setas de temporada en salsa de ají amarillo fresco, pecanas y aceitunas, con papas y arroz.',
          price: 16,
          allergens: ['H'],
        },
        'El PDF dice "Pilse": se interpreta como "Pilze" (setas).',
      ),
      dish({
        nameDe: 'Lomo Saltado Vegano',
        nameEs: 'Lomo saltado vegano',
        descriptionDe:
          'Saisonale Pilze, im Wok flambiert mit Tomate, Zwiebel, Frühlingslauch und Koriander, dazu Reis und Pommes frites.',
        descriptionEs:
          'Setas de temporada salteadas al wok con tomate, cebolla, cebolla china y cilantro, con arroz y papas fritas.',
        price: 17.9,
        diet: 'vegan',
        allergens: ['F'],
      }),
      dish({
        nameDe: 'Lomo Saltado de Carne o Pollo',
        nameEs: 'Lomo saltado de carne o pollo',
        descriptionDe:
          'Feine Rinderhüftsteak-Streifen oder Hähnchen, im Wok flambiert mit Tomate, Zwiebel, Frühlingslauch, Koriander oder Petersilie. Mit Pommes frites und Reis.',
        descriptionEs:
          'Tiras finas de lomo de res o de pollo salteadas al wok con tomate, cebolla, cebolla china, cilantro o perejil. Con papas fritas y arroz.',
        price: 21,
        allergens: ['F', 'L'],
      }),
      dish({
        nameDe: 'Lomo a lo Pobre',
        nameEs: 'Lomo a lo pobre',
        descriptionDe:
          'Feine Rinderhüftsteak-Streifen oder Hähnchen, im Wok flambiert mit Tomate, Zwiebel, Frühlingslauch, Koriander oder Petersilie, dazu Spiegelei und gebratene Kochbanane.',
        descriptionEs:
          'Tiras finas de lomo de res o de pollo salteadas al wok con tomate, cebolla, cebolla china, cilantro o perejil, con huevo frito y plátano frito.',
        price: 24.9,
        allergens: ['C', 'F', 'L'],
      }),
      dish({
        nameDe: 'Jalea Mixta',
        nameEs: 'Jalea mixta',
        descriptionDe:
          'Knusprig frittierter Meeresfrüchte-Mix und Fischstreifen in würziger Marinade, mit Maniok, Sarsa Criolla Acevichada und unseren verschiedenen Saucen.',
        descriptionEs:
          'Mezcla de mariscos y tiras de pescado fritas y crujientes, en un aliño picante, con yuca, sarsa criolla acevichada y nuestras salsas.',
        price: 24.9,
        allergens: ['A', 'B', 'C', 'D', 'F', 'G'],
      }),
    ],
  },
  {
    category: {
      nameDe: 'Vom Grill – Anticuchos',
      nameEs: 'A la parrilla – Anticuchos',
      status: visible,
    },
    dishes: [
      dish(
        {
          nameDe: 'Anticuchos Clásicos',
          nameEs: 'Anticuchos clásicos',
          descriptionDe:
            'Zart gegrillte Rinderherzspieße in würziger peruanischer Marinade, dazu Kartoffelscheiben, Choclo (gekochter Mais), Soße und Sarsa Criolla.',
          descriptionEs:
            'Brochetas de corazón de res a la parrilla, marinadas en un aliño peruano picante, con papas en rodajas, choclo, salsa y sarsa criolla.',
          price: 15.9,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Anticuchos Veganos',
          nameEs: 'Anticuchos veganos',
          descriptionDe:
            'Zart gegrillte Champignonspieße in würziger peruanischer Marinade, dazu Kartoffelscheiben, Choclo (gekochter Mais), Soße und Sarsa Criolla.',
          descriptionEs:
            'Brochetas de champiñones a la parrilla, marinadas en un aliño peruano picante, con papas en rodajas, choclo, salsa y sarsa criolla.',
          price: 15,
          diet: 'vegan',
          allergens: [],
        },
        'Precios 15,00 € y 17,90 € entre los anticuchos veganos y de carne: se usa 15,00 €, el que va junto al nombre.',
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Anticuchos de Carne',
          nameEs: 'Anticuchos de carne',
          descriptionDe:
            'Zart gegrillte Rindfleischspieße in würziger peruanischer Marinade, dazu Kartoffelscheiben, Choclo (gekochter Mais), Soße und Sarsa Criolla.',
          descriptionEs:
            'Brochetas de carne de res a la parrilla, marinadas en un aliño peruano picante, con papas en rodajas, choclo, salsa y sarsa criolla.',
          price: 17.9,
          allergens: [],
        },
        'Precios 15,00 € y 17,90 € entre los anticuchos veganos y de carne: se usa 17,90 € (el precio suelto).',
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Anticuchos de Pollo',
          nameEs: 'Anticuchos de pollo',
          descriptionDe:
            'Zart gegrillte Hähnchenspieße in würziger peruanischer Marinade, dazu Kartoffelscheiben, Choclo (gekochter Mais), Soße und Sarsa Criolla.',
          descriptionEs:
            'Brochetas de pollo a la parrilla, marinadas en un aliño peruano picante, con papas en rodajas, choclo, salsa y sarsa criolla.',
          price: 16,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
    ],
  },
  {
    category: { nameDe: 'Beilagen', nameEs: 'Guarniciones', status: visible },
    dishes: [
      dish(
        {
          nameDe: 'Arroz',
          nameEs: 'Arroz',
          descriptionDe: 'Reis.',
          descriptionEs: 'Arroz blanco.',
          price: 3,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Frejoles',
          nameEs: 'Frejoles',
          descriptionDe: 'Bohnen.',
          descriptionEs: 'Frejoles guisados.',
          price: 3.8,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Cancha',
          nameEs: 'Cancha',
          descriptionDe: 'Gerösteter Mais.',
          descriptionEs: 'Maíz tostado.',
          price: 4,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Papas fritas',
          nameEs: 'Papas fritas',
          descriptionDe: 'Pommes frites.',
          descriptionEs: 'Papas fritas en bastones.',
          price: 4,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Huevo frito',
          nameEs: 'Huevo frito',
          descriptionDe: 'Spiegelei.',
          descriptionEs: 'Huevo frito.',
          price: 1.9,
          allergens: [],
        },
        NO_ALLERGENS,
        'Es un huevo (¿C?).',
      ),
      dish(
        {
          nameDe: 'Plátano frito',
          nameEs: 'Plátano frito',
          descriptionDe: 'Gebratene Kochbanane.',
          descriptionEs: 'Plátano maduro frito.',
          price: 3.5,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
    ],
  },
  {
    category: { nameDe: 'Dips', nameEs: 'Salsas', status: visible },
    dishes: [
      dish(
        {
          nameDe: 'Chimichurri a la peruana',
          nameEs: 'Chimichurri a la peruana',
          descriptionDe:
            'Petersilie, Koriander, Oregano, Olivenöl, Essig, peruanischer Limo-Chili und Pfeffer.',
          descriptionEs:
            'Perejil, cilantro, orégano, aceite de oliva, vinagre, ají limo y pimienta.',
          price: 2.9,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Crema Pachamama',
          nameEs: 'Crema Pachamama',
          descriptionDe: 'Zwiebeln, Knoblauch und gelber Chili.',
          descriptionEs: 'Cebolla, ajo y ají amarillo.',
          price: 1.9,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Crema de Palta',
          nameEs: 'Crema de palta',
          descriptionDe: 'Avocado, vegane Mayo und Zitrone.',
          descriptionEs: 'Palta, mayonesa vegana y limón.',
          price: 1.9,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Crema de Oliva',
          nameEs: 'Crema de oliva',
          descriptionDe: 'Oliven und vegane Mayo.',
          descriptionEs: 'Aceitunas y mayonesa vegana.',
          price: 4,
          allergens: [],
        },
        'Precios 4,00 € y 1,90 € entre la Crema de Oliva y la Crema Pikante: se usa 4,00 €, el que va junto al nombre.',
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Crema Pikante',
          nameEs: 'Crema picante',
          descriptionDe: 'Zwiebeln, Knoblauch, peruanischer Rocoto- und Limo-Chili, vegane Mayo.',
          descriptionEs: 'Cebolla, ajo, rocoto y ají limo peruanos, mayonesa vegana.',
          price: 1.9,
          allergens: [],
        },
        'Precios 4,00 € y 1,90 € entre la Crema de Oliva y la Crema Pikante: se usa 1,90 € (el precio suelto).',
        NO_ALLERGENS,
      ),
      dish(
        {
          nameDe: 'Sarsa Criolla',
          nameEs: 'Sarsa criolla',
          descriptionDe: 'Zwiebelsalat mit Koriander und Paprika.',
          descriptionEs: 'Ensalada de cebolla con cilantro y pimiento.',
          price: 2.9,
          allergens: [],
        },
        NO_ALLERGENS,
      ),
    ],
  },
];

/**
 * Fotos de `material/fotos/` que corresponden a un plato (`dish` = nameDe). Las demás fotos de esa
 * carpeta no se usan aquí: equipo y cocinera (personas: datos personales), el local (interior) y
 * platos que no están en la carta (ensalada de quinoa, composición de varios platos).
 */
export const PHOTO_MAP: Record<string, { dish: string; altDe: string; altEs: string }> = {
  'WhatsApp Image 2026-11-21 at 05.40.23.jpeg': {
    dish: 'Causa veggie',
    altDe:
      'Causa veggie: geschichteter gelber Kartoffelteig mit Gemüse, garniert mit Paprika und Olive',
    altEs:
      'Causa vegetariana: capas de masa de papa amarilla con verduras, con pimiento y aceituna',
  },
  'WhatsApp Image 2026-11-21 at 05.40.24.jpeg': {
    dish: 'Solterito',
    altDe:
      'Solterito: Salat mit Saubohnen, Fetakäse, Kartoffeln, Mais und Oliven, daneben Zitronenhälften',
    altEs: 'Solterito: ensalada de habas, queso feta, papa, maíz y aceitunas, con medios limones',
  },
  'WhatsApp Image 2026-11-21 at 05.40.25.jpeg': {
    dish: 'Empanadas',
    altDe: 'Drei goldbraune Empanadas auf einem Holzbrett, davor drei Schälchen mit Dips',
    altEs: 'Tres empanadas doradas sobre una tabla de madera, con tres cuencos de salsas',
  },
  'WhatsApp Image 2026-11-21 at 06.15.23.jpeg': {
    dish: 'Tamal de Pollo',
    altDe: 'Tamal auf einem Bananenblatt, belegt mit Sarsa Criolla aus roten Zwiebeln und Paprika',
    altEs:
      'Tamal sobre una hoja de plátano, cubierto de sarsa criolla de cebolla morada y pimiento',
  },
  'WhatsApp Image 2026-11-21 at 06.15.24 (1).jpeg': {
    dish: 'Jalea Mixta',
    altDe:
      'Jalea Mixta: knusprig frittierte Meeresfrüchte und Fisch mit Maniok, Sarsa Criolla und Sauce',
    altEs: 'Jalea mixta: mariscos y pescado fritos y crujientes con yuca, sarsa criolla y salsa',
  },
};

type SeedService = Pick<
  MenuService,
  'listCategories' | 'createCategory' | 'createDish' | 'setDishImage'
>;

export type SeedOptions = {
  /** Carpeta con las fotos de PHOTO_MAP; sin ella no se procesan fotos. */
  photosDir?: string;
  /** Avisos (carpeta o foto que falta, foto no válida). Por defecto, console.warn. */
  warn?: (message: string) => void;
};

/**
 * Inserta la carta inicial a través del servicio (validación y procesado de fotos incluidos).
 * No hace nada si ya existe alguna categoría (también archivada): la carta se gestiona en el panel.
 */
export async function seedMenu(
  service: SeedService,
  { photosDir, warn = console.warn }: SeedOptions = {},
): Promise<{ created: boolean; dishes: number; photos: number }> {
  if ((await service.listCategories()).length > 0) {
    return { created: false, dishes: 0, photos: 0 };
  }

  const dishIds = new Map<string, number>();
  for (const group of MENU_SEED) {
    const category = await service.createCategory(categoryInputSchema.parse(group.category));
    for (const seed of group.dishes) {
      const created = await service.createDish(
        dishInputSchema.parse({ ...seed, categoryId: category.id }),
      );
      dishIds.set(created.nameDe, created.id);
    }
  }

  let photos = 0;
  if (photosDir !== undefined) {
    if (!existsSync(photosDir)) {
      warn(`Carpeta de fotos no encontrada (${photosDir}): la carta se carga sin fotos.`);
    } else {
      for (const [file, photo] of Object.entries(PHOTO_MAP)) {
        const path = join(photosDir, file);
        const id = dishIds.get(photo.dish);
        if (id === undefined || !existsSync(path)) {
          warn(`Foto no encontrada, se omite: ${file}`);
          continue;
        }
        try {
          await service.setDishImage(id, await readFile(path), {
            altDe: photo.altDe,
            altEs: photo.altEs,
          });
          photos += 1;
        } catch (err) {
          warn(`No se pudo procesar ${file}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  return { created: true, dishes: dishIds.size, photos };
}
