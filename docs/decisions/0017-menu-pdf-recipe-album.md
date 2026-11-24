# 0017 — PDF de la carta «El recetario»: foto y descripción de cada plato

- **Fecha:** 2026-11-24
- **Estado:** Aceptada (sustituye el diseño del PDF del ADR 0009; mantiene su generación con react-pdf)

## Contexto

El PDF de la carta seguía con el diseño provisional de la fase 5 y solo llevaba una foto por categoría. En pendientes había una nota para quitar las fotos del PDF, porque se montaban unas sobre otras y pesaban. El restaurante pidió lo contrario: **la carta lleva las fotos de los platos**, así que la nota se ha quitado.

Siguiendo la regla de impresos (AGENTS.md, Diseño) se compararon cuatro maquetas A4 con la carta real y sus 50 fotos: A «El orillo» (basada en las bandas de la web), B «El recetario», C «Cartel chicha» y D «El quipu». El usuario eligió la **B** con dos cambios: la portada no lleva platos y todos los platos llevan siempre su descripción.

## Decisión

- **Portada de álbum sin platos:** fondo selva, franjas tejidas arriba y abajo y una etiqueta de papel pegada con cinta (logo, «Speisekarte»/«Carta», frase manuscrita y dirección). Debajo, el lema a mano.
- **Cada plato en su polaroid:** foto con marco de papel, cinta del color de su categoría (los colores de la web por turnos, ADR 0016) y un leve giro alterno. Debajo van el nombre, el precio, la dieta, los alérgenos (con letras, no solo color) y **la descripción, siempre**. Un plato sin foto conserva su hueco con un rombo tejido, así que nada se descoloca.
- **Rejilla:** 2 columnas; 3 columnas en las categorías cortas (todas las descripciones de 90 caracteres o menos en los dos idiomas, `columnsFor`). Cada fila va entera en una página (`wrap={false}`) y la cabecera de la categoría queda unida a su primera fila, así las fotos nunca se parten ni se montan.
- **Cabecera de categoría:** nombre en Fraunces y, si la categoría tiene descripción en el panel, esa frase en letra manuscrita.
- **Fotos ligeras:** `loadDishPhotos` toma la versión WebP de 400 px de cada plato y la pasa a JPEG de 360 px (calidad 72). La carta real (50 fotos) pesa unos 430 KB por idioma. Solo se aceptan nombres de archivo generados por el servidor.
- **Fuente manuscrita:** Caveat 500 (OFL, la misma de la web) incrustada desde `apps/api/assets/fonts`.
- **Paleta:** la de la web (selva, maíz, ají, chicha) y papel de álbum (`pdf-theme.ts`). El precio usa el color de la categoría, salvo el maíz, que no tiene contraste AA sobre papel y se cambia por ají oscuro. Las etiquetas de dieta ya no van en mayúsculas.
- La página final de alérgenos, distintivos, dirección y horario se mantiene con la paleta nueva.

## Alternativas consideradas

- **A · El orillo:** el borde tejido de cada página cambia de color con la categoría y los platos van en filas con una foto cuadrada. Es la más fácil de hojear, pero muy cercana a la web.
- **C · Cartel chicha:** la gráfica popular de Lima, con tipografía gruesa y una foto grande por categoría. Es la más atrevida, pero necesita una fuente gruesa nueva y deja menos sitio a las descripciones.
- **D · El quipu:** un cordón central con los platos a cada lado. Tiene mucha identidad, pero las fotos son pequeñas y el texto alineado a la derecha se lee peor.

## Consecuencias

- El PDF pasa de 3 a 10 páginas aproximadamente (portada, 8 de platos y leyenda) y sigue por debajo de 0,5 MB.
- Las descripciones de categoría del panel se ven en el PDF en letra manuscrita: conviene que sean frases cortas.
- `CategoryPhotos`/`loadCategoryPhotos` se sustituyen por `DishPhotos`/`loadDishPhotos`.
