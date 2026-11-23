# 0014 — Página Contacto: postal, quipu y horario desde el panel

- **Fecha:** 2026-11-23
- **Estado:** Aceptada (aplica ADR 0013 a Contacto; amplía ADR 0011 y 0012)

## Contexto

Contacto era una ficha de datos con el mapa al lado y repetía la plantilla de siempre. Siguiendo la regla de páginas por bloques (ADR 0013), se compararon cuatro maquetas: A «Postkarte», B «Quipu», C «Editorial» (la más cercana a aioli-schnoor.de) y D «Der Weg». El usuario eligió la **A** con el quipu de la **B** en el bloque de horario.

Además, la página mostraba el horario como texto fijo (`RESTAURANT_INFO.openingHours`), mientras que el horario real lo edita el personal en el panel (tablas `opening_hours` y `closures`, ADR 0012).

## Decisión

- **Bloques** (`components/public/contact/`):
  - `ContactPostcard`: título y una postal «desde Perú». En una cara la foto del local con «¡Hola, Bremen!», y en la otra un saludo manuscrito, un sello con el logo, un matasellos con la fecha del día y la dirección real dentro de un `<address>`.
  - `ContactHours`: fondo selva, estado en directo, lista del horario por días y el **quipu** (un cordón por día, un nudo por hora abierta y el día de descanso suelto). Debajo, el teléfono y el email.
  - `ContactMap`: mapa estático local pegado con cinta, con una nota manuscrita, enlaces externos y la atribución de OSM (sin cambios respecto al ADR 0011).
  - `ContactFarewell`: «¡Hasta pronto!» y el botón Reservar.
- **Horario desde el panel:** `GET /api/v1/opening-hours` (público y de solo lectura) devuelve `{ hours, closures: [{ from, to }] }`. Solo da las fechas de los cierres, nunca el motivo, porque es texto interno. Reutiliza la caché de `getBookingContext`.
- **Lógica compartida** en `packages/shared` (`opening-status.ts`): `publicOpeningHoursSchema`, `weekSchedule` y `openingStatus`. Calcula «abierto, cierra a las…», «abre hoy a las…», «cerrado» o «cerrado por cierre hasta…» con la hora de Berlín, y admite turnos partidos.
- **Accesibilidad:** el quipu es solo un dibujo (`aria-hidden`). El horario está también como lista de texto (`<dl>`). Los nudos aparecen al hacer scroll con `useReveal`, y con `prefers-reduced-motion` se ven desde el principio.
- **Respaldo:** si la API falla, se muestra el texto fijo `RESTAURANT_INFO.openingHours`.
- **Datos de contacto confirmados** por el usuario el 2026-11-23: el teléfono +49 1521 4982818 y el email pachamamarestaurantperu@gmail.com. `contactConfirmed: true` y se quitan de `provisionalFields`.

## Alternativas consideradas

- **C · Editorial**: incluía un formulario de contacto, que habría sido una funcionalidad nueva (API, SMTP, DSGVO). Se descarta por ahora.
- **D · Der Weg**: un recorrido desde la estación, pero el camino real no está confirmado.
- **Horario fijo pasado a datos por día**: más rápido, pero tendríamos dos horarios que se contradicen y los cierres no se verían.

## Consecuencias

- Nuevo endpoint público, documentado en `docs/api.md`. No tiene datos personales ni escrituras, y usa el límite general de `/api/v1`.
- Inicio y el pie siguen con el texto fijo del horario. Se pueden pasar al endpoint más adelante (anotado en `docs/pendientes.md`).
