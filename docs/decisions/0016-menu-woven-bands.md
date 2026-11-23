# 0016 — Carta como manta: bandas de color por categoría y barra «telar»

- **Fecha:** 2026-11-23
- **Estado:** Aceptada (aplica ADR 0013 a la Carta; amplía ADR 0010)

## Contexto

La Carta seguía siendo la plantilla de M2: cabecera verde, barra de enlaces subrayados y la misma lista para todas las categorías. Siguiendo la regla de vistas públicas (AGENTS.md, Diseño), se compararon cuatro maquetas con la carta real (7 categorías, unos 50 platos): A «Los tres tiempos», B «La pizarra», C «El mercado» y D «La manta».

Referencia del usuario: muchosmas.eu/lacarta. Divide su carta por momentos (mediodía, brunch, tapas), porque tiene cartas distintas, y las publica en PDF. Se toma el espíritu, con la carta dividida en bloques con identidad propia, pero no el PDF: la carta en HTML se lee mejor en el móvil, es accesible y la encuentran los buscadores. El usuario eligió la **D**.

## Decisión

- **Cabecera clara** (`MenuHero`) en vez de `PageHeader`: título grande, la frase manuscrita «jede Farbe unserer Manta, eine Kategorie», la entradilla y el enlace al PDF.
- **Una banda por categoría** (`components/public/menu/menu-band.tsx`): la franja tejida, una cabecera del color de la banda con una hilera de rombos que se desvanece hacia el título, el número de platos y la descripción de la categoría, si la tiene. Debajo, los platos llevan un rombo del color de la banda, que gira al pasar el ratón (`motion-safe`). Las fotos de los platos van dentro de su fila.
- **Colores** (`menu-bands.ts`, `BAND_TONES`): ají oscuro, maíz, chicha y selva, en turno. Una categoría nueva del panel coge el siguiente color sin tocar el código. El texto sobre maíz es tierra y sobre los demás papel, todo con contraste AA.
- **Rejilla compacta automática** (`isCompactCategory`): si ningún plato tiene foto y todas las descripciones tienen 90 caracteres o menos (guarniciones, salsas), los platos van en 2–3 columnas.
- **Barra «telar»** (`MenuLoom`): un hilo por categoría, del color de su banda, que se llena según la parte leída de la sección. Sigue al scroll y nunca se mueve sola (WCAG 2.2.2). El enlace de la sección visible lleva `aria-current`. En el móvil se muestran los hilos y el nombre de la categoría actual; los nombres de todas siguen disponibles para lectores de pantalla. Se mantienen el salto con foco al título y la posición pegada bajo la cabecera.
- **Movimiento:** entrada del título y `useReveal` por plato. Con `prefers-reduced-motion` todo se ve sin animar.

## Alternativas consideradas

- **A · Los tres tiempos** (entrada, fondo, acompañamientos, con tiras de fotos como Muchos Más): cuenta cómo se come en Perú, pero las listas eran muy parecidas entre sí.
- **B · La pizarra** (pestañas y filtros de dieta y alérgenos): la más práctica, pero oculta la carta tras pestañas. El filtro «Ich vertrage kein …» queda como idea para más adelante.
- **C · El mercado** (un bloque distinto por categoría: rombos, tickets, brocheta…): la de más identidad, pero exige diseñar un bloque nuevo por cada categoría que se añada.

## Consecuencias

- `PageHeader` ya no se usa en la Carta (sigue en Impressum, Datenschutz y Reservar). `navLinkClass` de `styles.ts` desaparece.
- Las descripciones de categoría se ven ahora en la banda: conviene que sean cortas (una frase).
