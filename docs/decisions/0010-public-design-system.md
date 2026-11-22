# 0010 — Sistema de diseño de la web pública

- **Fecha:** 2026-11-22
- **Estado:** Aceptada

## Contexto

La web pública necesitaba una identidad propia antes de crear sus páginas (M2). No hay Figma ni manual de marca: solo el logo (verde, con una versión mostaza) y 11 fotos del restaurante, con platos sobre mantas andinas de colores y un local muy colorido. Las referencias del usuario (muchosmas.eu, aioli-schnoor.de) siguen el patrón de portada con foto y botón, adelanto de la carta, ubicación con horario y pie con Impressum/Datenschutz.

## Decisión

Dirección «Selva + manta», aprobada por el usuario el 2026-11-22 tras ver la maqueta.

- **Tokens** en `apps/web/src/index.css` (Tailwind v4, `@theme`): `selva #2F4A2B`, `maiz #E3B23C`, `papel #F7F5EE`, `tierra #1F2A1D`; `aji #C8402A` y `chicha #6B2D5C` solo en la franja tejida. Las variables de shadcn (`--primary`, `--background`…) apuntan a esta paleta, así que el panel `/admin` la hereda.
- **Tipografía:** Fraunces (títulos) + Work Sans (texto), la misma pareja que el PDF de la carta, **alojada en local** con `@fontsource-variable` (sin Google Fonts: DSGVO).
- **Elemento distintivo único:** `WovenStripe`, una franja SVG inspirada en la manta (no copiada). Solo bajo la cabecera y sobre el pie; el resto, sobrio.
- **Componentes públicos** en `apps/web/src/components/public/`: `SiteHeader` (menú móvil con `Sheet`, enlace para saltar al contenido), `SiteFooter`, `ReserveButton`, `Photo`, `WovenStripe`.
- **Botón Reservar:** un único componente cuyo destino depende de `RESERVATIONS_MODE` en `packages/shared` (`'phone'` → `tel:` hasta la fase 7; `'form'` → `/de/reservieren` · `/es/reservar`).
- **Rutas localizadas** en `packages/shared/src/site/public-routes.ts` (`publicPath`, `pageFromSlug`); el selector de idioma conserva la página equivalente.
- **Fotos:** WebP sin metadatos en `apps/web/public/images/photos/` (640/1280 px), generadas con `apps/api/scripts/optimize-public-images.ts`.
- **Movimiento:** una sola entrada animada en la portada, desactivada con `prefers-reduced-motion`.

## Alternativas consideradas

- **Verde oscuro dominante** — más elegante, pero la carta se lee peor en móvil y pierde el color del local.
- **Manta a todo color** — fiel al local, pero recarga la página y compite con las fotos de los platos.
- **Google Fonts** — más cómodo, pero envía la IP del visitante a Google sin consentimiento (sentencia LG München 2022).

## Consecuencias

- Nuevas dependencias en la web: `@fontsource-variable/fraunces` y `@fontsource-variable/work-sans`.
- El logo es PNG (600 px): no hay herramienta local para pasar el PDF vectorial a SVG. Si llega un SVG original, se sustituye en `public/images/`.
- La Inicio pública ya no muestra el estado de la API; `ApiStatus` queda cubierto por su test unitario y `e2e/loading-states.spec.ts` se eliminó con permiso del usuario. Los e2e de estados de carga vuelven en M2 con la Carta.
