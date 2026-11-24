# Plan — PDF de la carta «El recetario» (2026-11-24)

Maqueta elegida: **B · El recetario**, con dos cambios del usuario: la portada no lleva platos y todos los platos llevan su descripción, también los de las categorías cortas.

## Tareas

1. **Fotos de todos los platos** (`pdf/photos.ts`): `loadDishPhotos` lee la versión de 400 px de cada plato con foto y la pasa a JPEG de 360 px de ancho (calidad 72). Si falta un archivo, ese plato sale con el hueco de foto vacío (marco con rombo), pero el PDF se genera igual. Tests: un plato por foto, archivo que falta y nombre inseguro.
2. **Reglas de maquetación** (`pdf/layout.ts`, funciones puras): color de cada categoría por turnos (los mismos de la web, ADR 0016), 2 columnas o 3 en las categorías cortas (descripciones de 90 caracteres o menos) y reparto en filas. Con tests unitarios.
3. **Fuente manuscrita**: Caveat 500 (OFL) en `apps/api/assets/fonts`, registrada junto a Fraunces y Work Sans, y añadida a la descarga de fuentes entre renders.
4. **Maquetación** (`pdf/menu-pdf.tsx`, `ornaments.tsx`, `pdf-theme.ts`, `labels.ts`):
   - Portada de tapa de álbum: fondo selva, franjas tejidas arriba y abajo, etiqueta de papel con cinta, logo, título, frase manuscrita y dirección. Sin platos.
   - Páginas de platos: cabecera con nombre y descripción de la categoría (manuscrita). Cada plato lleva una polaroid con cinta del color de la categoría, nombre, precio, dieta, alérgenos y **descripción siempre**. Cada fila va con `wrap={false}` y la cabecera queda unida a la primera fila.
   - La página de leyenda se mantiene, con la paleta nueva.
5. **Tests de la API**: el PDF incluye las descripciones de todos los platos y pesa menos de 3 MB con fotos en todos los platos.
6. Revisión visual del PDF real (de y es), `npm run check:all`, ADR 0017, roadmap y PR.
