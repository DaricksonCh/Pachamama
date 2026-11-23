# Créditos de fotos de stock (provisionales)

Fotos usadas **mientras llegan las fotos profesionales del restaurante**. Todas son de [Pexels](https://www.pexels.com/license/) (licencia de Pexels: uso gratuito, también comercial, sin atribución obligatoria; no se pueden vender sin modificar ni dar a entender que las personas o marcas que salen respaldan el restaurante). Descargadas el 2026-11-23 a 2600 px de ancho.

- **Originales:** `material/fotos-stock/` (fuera del repo, como el resto de `material/`).
- **Versiones WebP:** `apps/web/public/images/photos/stock-*` (generadas con `npx tsx apps/api/scripts/optimize-public-images.ts`).
- **Registro en el código:** claves `stock*` en `apps/web/src/components/public/photo.tsx`.

Son fotos de platos de otros restaurantes: se usan como ambientación, **no** como foto del plato concreto de la carta (los platos de la carta llevan las fotos propias subidas desde `/admin`). Para retirarlas: sustituir las claves `stock*` en los componentes, borrar las entradas de `STOCK_PHOTOS` en el script y los archivos `stock-*`.

| Archivo WebP              | Dónde se usa                         | Autor                    | Original en Pexels                                                                                      |
| ------------------------- | ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `stock-festin-peruano`    | Inicio (cabecera), Historia (cocina) | Jaime Joel Vargas Huacre | [35449183](https://www.pexels.com/photo/peruvian-feast-with-traditional-dishes-and-drinks-35449183/)    |
| `stock-ceviche`           | Inicio, «Aus unserer Küche»          | Nano Erdozain            | [28448389](https://www.pexels.com/photo/delicious-peruvian-ceviche-with-fried-fish-28448389/)           |
| `stock-lomo-saltado`      | Inicio, «Aus unserer Küche»          | Nano Erdozain            | [28503593](https://www.pexels.com/photo/delicious-peruvian-lomo-saltado-with-fries-28503593/)           |
| `stock-causa-rellena`     | Inicio, «Aus unserer Küche»          | Nano Erdozain            | [28448385](https://www.pexels.com/photo/elegant-peruvian-causa-rellena-on-blue-plate-28448385/)         |
| `stock-tamales`           | Historia (cocina)                    | Nano Erdozain            | [29465177](https://www.pexels.com/photo/traditional-tamales-with-ingredients-on-wooden-table-29465177/) |
| `stock-empanadas`         | Historia (galería)                   | Caleb Oquendo            | [40108720](https://www.pexels.com/photo/delicious-empanadas-on-white-plate-40108720/)                   |
| `stock-causa-langostinos` | Historia (galería)                   | Nano Erdozain            | [30766464](https://www.pexels.com/photo/gourmet-shrimp-causa-on-blue-plate-30766464/)                   |
| `stock-jalea-mixta`       | Historia (galería)                   | Nano Erdozain            | [30766476](https://www.pexels.com/photo/delicious-peruvian-seafood-platter-with-fries-30766476/)        |
| `stock-ensalada-quinua`   | Historia (galería)                   | Galiya Tenisheva         | [20590326](https://www.pexels.com/photo/herbs-vegetables-and-rice-on-plate-20590326/)                   |
| `stock-papa-huancaina`    | Historia (galería)                   | Nano Erdozain            | [28448378](https://www.pexels.com/photo/delicious-peruvian-papa-a-la-huancaina-dish-close-up-28448378/) |
| `stock-maiz-morado`       | Historia (galería)                   | Nano Erdozain            | [28490839](https://www.pexels.com/photo/close-up-of-fresh-purple-corn-on-cutting-board-28490839/)       |
| `stock-mercado-andino`    | Historia (galería)                   | Ernesto Rosas            | [32407761](https://www.pexels.com/photo/traditional-andean-market-foods-in-tuti-peru-32407761/)         |

Se mantienen las fotos propias del restaurante con personas (cocinera, equipo) y las del local (comedor), que no se sustituyen por stock.
