# 0015 — Inicio por bloques: el nombre, la historia, la cocina y la visita con horario vivo

- **Fecha:** 2026-11-23
- **Estado:** Aceptada (aplica ADR 0013 a Inicio; amplía ADR 0014)

## Contexto

Inicio seguía siendo la plantilla de M1 (hero, foto y texto, tres platos, visita) y mostraba el horario como texto fijo. Siguiendo la regla de vistas públicas (AGENTS.md, Diseño), se compararon cuatro maquetas con fotos, colores y textos reales: A «La mesa», B «Pacha Mama», C «La familia» y D «La manta». Referencias tomadas como espíritu: muchosmas.eu (Reservar siempre a mano, tono de familia) y aioli-schnoor.de (bloques con ritmo y cierre corto). El usuario eligió una mezcla (maqueta E).

## Decisión

- **Bloques** (`components/public/home/`):
  - `HomeHero` (de B): «Pacha» y «mama» enormes, con _tierra_ y _madre_ escritas a mano (claves de `story.name`), junto a la foto del mercado andino en arco. Los nombres son decorativos (`aria-hidden`); el `h1` sigue siendo «Cocina peruana en pleno Bremen».
  - `HomeStory` (nuevo): la puerta a Historia, con dos fotos pegadas con cinta (cocinera y equipo) y un botón visible «Leer nuestra historia».
  - `HomeKitchen` (A + D): los tres clásicos sobre el fondo oscuro de A, con el del centro más bajo, y las fotos recortadas en rombo como los de la manta (de D), con borde maíz. Costuras en zigzag arriba y abajo (`.zigzag-seams`). Los precios siguen saliendo de la carta.
  - `HomeVisit` (de A): comedor, dirección, horario, teléfono y Reservar, con los textos «Y luego, sobremesa» y «Quédate el tiempo que quieras.».
- **Horario vivo** (`HomeHours`): lee `GET /api/v1/opening-hours` (ADR 0014) para **hoy** en hora de Berlín. Muestra solo tres cosas:
  1. Una línea de estado: «Abierto ahora · hasta las 22:00», «Hoy abrimos a las…», «Hoy descansamos · mañana desde las 13:00», «Ahora cerrado · jueves desde las 13:00» o «Cerrado hasta el … incluido».
  2. Una tira de siete días: hoy relleno y el día de descanso tachado. Es decorativa (`aria-hidden`), porque el texto lo dice todo.
  3. Un resumen agrupado («Mar–Dom 13:00–22:00», «Lun cerrado»), más una etiqueta si hay un cierre en los próximos 30 días.
     Si la API falla, se muestra el texto fijo `RESTAURANT_INFO.openingHours`.
- **Lógica compartida** nueva en `packages/shared/src/reservations/opening-status.ts`: `nextOpening`, `groupWeek` y `upcomingClosure`, con sus tests. `useNow`, `weekdayNames` y `formatDayMonth` pasan a `features/opening-hours/` y los comparten Contacto e Inicio.
- **Textos:** en Historia y Cocina, lorem ipsum hasta que lleguen los textos reales; el titular, los nombres de los platos, los precios, la navegación y Visítanos son reales. `npm run check:publish` ya bloquea la publicación mientras quede lorem.
- **Movimiento:** una entrada del nombre al cargar y `useReveal` por bloque, con retardo escalonado en los platos. Con `prefers-reduced-motion` todo se ve sin animar.

## Alternativas consideradas

- **B completa** (ingredientes que llevan a un plato, dirección como tipografía gigante): con mucha identidad, pero el usuario prefirió la cocina de A/D y la visita de A.
- **C · La familia** (equipo en el hero, tira de platos y «¿Nos vemos?»): se tomó solo la idea del estado en directo.
- **Horario completo en Inicio**: se descarta por minimalismo. El detalle por días sigue en Contacto (quipu).

## Consecuencias

- La presentación de los **turnos partidos** en Inicio funciona (una línea por grupo), pero queda por revisar con el horario real (`docs/pendientes.md`).
- `KitchenSection` pasa a ser `HomeKitchen`.
