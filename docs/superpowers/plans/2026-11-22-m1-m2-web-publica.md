# Plan M1 (Diseño) + M2 (Páginas públicas) — Pachamama

## Contexto

El restaurante se queda sin web el **01.12.2026**. F3 (BD + login) y F5 (carta editable + PDF) están hechas, pero la parte pública es solo un placeholder (`apps/web/src/pages/home-page.tsx`, ruta `/:lang`). M1 da a la web una identidad propia y M2 crea las páginas públicas de/es que necesita el restaurante para publicar en M4 (29.11).

**Lo que ya existe y se reutiliza**

- Tokens provisionales en `apps/web/src/index.css` (Tailwind v4, `@theme`, variables shadcn): verde `#2f4a2b`, mostaza `#e3b23c`, crema `#fbf6ec`. Tokens `brand-*` antiguos (ámbar) por retirar.
- shadcn (ADR 0008) con 20 componentes en `src/components/ui/`.
- Fuentes Fraunces + Work Sans (OFL, `@fontsource`) ya usadas en el PDF (`apps/api/src/modules/menu/pdf/fonts.ts`) → misma pareja en la web, **autoalojadas** (DSGVO: nada de Google Fonts).
- API pública: `GET /api/v1/menu` (JSON + ETag) y `GET /api/v1/menu/pdf?lang=`; `menuPdfUrl(lang)` en `src/features/menu/pdf-url.ts`; `apiGet` en `src/lib/api.ts`; schemas en `@pachamama/shared`.
- i18n por prefijo `/:lang` (`layouts/language-layout.tsx`), namespace único `common`.
- `RESTAURANT_INFO` en `packages/shared/src/restaurant/restaurant-info.ts` (dirección, horario, `isProvisional`), aún sin teléfono ni email.
- E2e Playwright (escritorio + Pixel 7) con axe WCAG 2.2 AA en `apps/web/e2e/`.
- Material: logo (PNG 600 px verde; también existe versión mostaza), 11 fotos (platos sobre manta andina, interior del local colorido).

**Referencias analizadas** (muchosmas.eu, aioli-schnoor.de): ambas siguen el patrón _hero con foto + CTA → intro → teaser de carta → ubicación/horario → pie con Impressum/Datenschutz_; carta en HTML + PDF descargable; ninguna tiene cambio de idioma. Tomamos la estructura clara y el PDF; nos diferenciamos con la identidad andina y el bilingüismo real.

## M1 — Diseño (rama `feat/m1-diseno`)

Skills: `frontend-design`, `tailwind-design-system`, `web-design-guidelines`, `accessibility`, `shadcn`.

### Dirección visual propuesta: «Selva + manta» (corregible)

- **Color** (5 tokens con nombre, en `index.css`):
  - `selva` `#2F4A2B` — verde del logo: hero, cabecera móvil, pie, botones primarios.
  - `maiz` `#E3B23C` — mostaza del logo alternativo: CTA y foco visible sobre verde.
  - `papel` `#F7F5EE` — fondo de lectura (claro, algo verdoso; **no** el crema genérico).
  - `tierra` `#1F2A1D` — texto.
  - `aji` `#C8402A` + `chicha` `#6B2D5C` — solo dentro de la franja tejida y detalles mínimos (vienen de la manta y del interior del local).
  - Contrastes comprobados AA (mostaza solo sobre verde o con texto oscuro).
- **Tipografía**: Fraunces (títulos, con su eje óptico usado de forma expresiva en el hero) + Work Sans (texto, carta, UI). Escala modular 1.25, líneas ≤ 75 caracteres, sin mayúsculas tracked en etiquetas.
- **El elemento memorable (uno solo)**: una **franja tejida** hecha en CSS/SVG (bandas finas con motivo de rombos, inspirada —no copiada— en la manta de las fotos) que separa cabecera, secciones clave y pie. Todo lo demás, sobrio.
- **Layout**: alineado a la izquierda, rejilla de 12 col. en escritorio / 1 col. en móvil; las fotos de platos son los protagonistas, sin tarjetas idénticas con sombra.
  ```
  [logo] Speisekarte Geschichte Kontakt  [Reservieren] DE|ES
  ═══ franja tejida ═══════════════════════════
  ██ VERDE: título Fraunces grande │ foto plato ██
  ██ [Tisch reservieren] [Speisekarte ansehen] ██
  papel: 3 platos destacados · horario hoy · dirección
  ═══ franja tejida ═══════════════════════════
  ██ pie verde: dirección, horario, tel, legal ██
  ```
- **Movimiento**: una sola entrada orquestada en el hero; respeta `prefers-reduced-motion`.

### Tareas M1

1. Tokens definitivos en `index.css` (retirar `brand-*`), fuentes `@fontsource` autoalojadas, variables shadcn mapeadas a la paleta.
2. Logo para la web: SVG si se puede vectorizar con calidad del PDF original (`material/logo/logo.pdf`); si no, WebP/PNG 2x en `apps/web/public/`. Favicon nuevo.
3. Fotos: script `sharp` (ya en la API) → WebP responsive (640/1280/1920) sin EXIF en `apps/web/public/images/`; elegir foto de hero (propuesta: tamal o causa) y 3 destacadas.
4. Componentes públicos base: `PublicLayout` (cabecera con nav + menú móvil con `Sheet`, pie), `WovenStripe`, `PageHeader`, `Section`.
5. **Maqueta navegable**: la Inicio real con contenido real, capturas escritorio/móvil → **te la enseño y espero tu visto bueno antes de M2**.
6. ADR 0010 «Sistema de diseño público» (tokens, fuentes locales, franja).

## M2 — Páginas públicas (rama `feat/m2-paginas-publicas`)

Skills: `web-feature`, `vercel-react-best-practices`, `tanstack-query-best-practices`, `loading-states`, `accessibility`, `gdpr-dsgvo-expert`, `seo` (metas básicas), `testing-strategy`, `vitest`, `playwright-best-practices`.

**URLs localizadas** (mi propuesta, mejor SEO):

| Página      | de                | es                |
| ----------- | ----------------- | ----------------- |
| Inicio      | `/de`             | `/es`             |
| Carta       | `/de/speisekarte` | `/es/carta`       |
| Historia    | `/de/geschichte`  | `/es/historia`    |
| Contacto    | `/de/kontakt`     | `/es/contacto`    |
| Impressum   | `/de/impressum`   | `/es/aviso-legal` |
| Datenschutz | `/de/datenschutz` | `/es/privacidad`  |

### Tareas M2 (en orden)

1. **Base compartida**: mapa de rutas localizadas en `packages/shared` (`publicRoutes`), `LanguageSwitcher` que conserva la página equivalente, `RESTAURANT_INFO` con teléfono/email (provisionales), título y meta description por página, `<html lang>`.
2. **Inicio**: hero, platos destacados, horario, dirección, CTA a carta y teléfono.
3. **Carta**: hook `usePublicMenu` (TanStack Query + Zod de shared) sobre `/api/v1/menu`; categorías con ancla, precio formateado por idioma, alérgenos con leyenda accesible, etiquetas de dieta, foto si hay; 4 estados (skeleton/datos/vacío/error); botón «PDF descargar».
4. **Historia**: texto lorem marcado como provisional + foto del local/cocinera.
5. **Contacto**: dirección, horario, teléfono/email (`tel:`/`mailto:`), mapa = **imagen estática local con atribución OSM + enlaces «Abrir en Google Maps / OpenStreetMap»** (sin terceros, sin banner; propuesta corregible). Sin formulario (las reservas van después del 01.12).
6. **Impressum + Datenschutz** de/es con datos de `RESTAURANT_INFO`, campos pendientes visibles como provisionales; Datenschutz describe solo lo real (hosting UE, logs, cookies técnicas del panel, sin analítica, sin terceros). Enlazados desde el pie de todas las páginas.
7. **Botón «Reservar» listo para la fase 7**: componente único `ReserveButton` en cabecera (escritorio y menú móvil), hero de Inicio y Contacto, con estilo de CTA principal (mostaza). Su destino sale de una sola config en `packages/shared` (`RESERVATIONS_MODE`): hoy `'phone'` → `tel:` del restaurante con texto «Tisch reservieren · anrufen» (de/es); en la fase 7 se cambia a `'form'` → ruta ya reservada `/de/reservieren` · `/es/reservar` en `publicRoutes`, sin tocar ninguna página. Tests de ambos modos.
8. **Bloqueo de publicación**: test `check:publish` (fuera de `check:all` para no ponerlo en rojo hoy) que falla mientras haya datos provisionales; se exige en M4.
9. Docs: `roadmap.md`, `pendientes.md`, `testing.md`, ADR 0011 «Mapa sin terceros».

## Subagentes y modelos (según tus reglas del 2026-11-22)

| Trabajo                                                                     | Quién                                                                                                                                                    | Modelo                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Dirección visual, tokens, `WovenStripe`, maqueta de Inicio (M1.1, 1.4, 1.5) | Agente principal (diseño = criterio, no delegable)                                                                                                       | sesión                   |
| Logo + fotos WebP (M1.2–1.3)                                                | 1 subagente implementador, **en paralelo** con lo anterior (archivos distintos: `public/`, `scripts/`)                                                   | Haiku                    |
| Cada tarea de M2 (1→6)                                                      | `subagent-driven-development`: 1 implementador por tarea, **secuencial** (comparten `router.tsx` y `common.json`, así que nunca dos escritores a la vez) | Sonnet (Historia: Haiku) |
| Revisión entre tareas                                                       | ligera, la hago yo leyendo el diff (UI/datos)                                                                                                            | —                        |
| Re-revisión de correcciones pequeñas                                        | revisor                                                                                                                                                  | Haiku                    |
| Contacto, Impressum, Datenschutz, fuentes/mapa                              | `security-privacy-reviewer` (revisión completa: DSGVO)                                                                                                   | Sonnet                   |
| Antes de fusionar cada rama                                                 | `code-reviewer`                                                                                                                                          | Sonnet                   |
| Verificación final (check:all, e2e, axe, navegador)                         | `qa-tester`, una vez por rama al final                                                                                                                   | Haiku                    |
| Si algo falla 2 veces o el diseño se atasca                                 | aviso antes de usar                                                                                                                                      | Opus                     |

Hallazgos menores → `docs/pendientes.md` (salvo seguridad/accesibilidad).

## Verificación

- Unit (Vitest): switcher conserva ruta; `usePublicMenu` (datos/vacío/error); formato de precios de/es; Carta renderiza alérgenos; test de `publicRoutes` (todas las páginas en ambos idiomas).
- E2e (Playwright, escritorio + móvil): navegar las 6 páginas en de y es; cambio de idioma conserva página; carta con 4 estados (mock de red); descarga del PDF; axe WCAG 2.2 AA en **todas** las páginas; **cero peticiones a dominios externos**; sin errores de consola; foco visible y menú móvil por teclado.
- Navegador: `npm run dev` + capturas escritorio/móvil para ti.
- Cierre de cada rama: `npm run check:all` en verde → code-reviewer → commit → push → PR a `development` → actualizar `roadmap.md`.

## Calendario

- M1: 22–24.11 (maqueta para tu visto bueno el 23–24).
- M2: 25–28.11 (margen respecto al plan original 27–28).
