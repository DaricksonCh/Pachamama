# Traspaso — estado al 2026-11-22

Para el próximo agente o persona que continúe. Antes de nada, lee `AGENTS.md` (reglas, flujo de ramas, modelos de subagentes, skills obligatorias).

## Dónde estamos

| Bloque              | Estado                                             | Dónde             |
| ------------------- | -------------------------------------------------- | ----------------- |
| F3 BD + login       | ✅ en `development`                                | —                 |
| F5 Carta editable   | ✅ en `development`                                | —                 |
| M1 Diseño           | ✅ en `development` (PR #2 fusionada)              | ADR 0010          |
| M2 Páginas públicas | ✅ en `development` (PR #3 fusionada, CI en verde) | ADR 0011          |
| M4 Publicación      | ⏳ sin empezar (necesita visto bueno)              | `docs/roadmap.md` |

Plan aprobado de M1 + M2: `docs/superpowers/plans/2026-11-22-m1-m2-web-publica.md`.

## Siguiente paso inmediato

1. M2 ya está en `development` (fusionada el 2026-11-22; `check:all` en verde: 334 unitarios, 129 e2e).
2. Pedir al usuario el visto bueno para **M4** (publicación) o para los cambios de diseño y PDF que ha pedido (ver «Pendiente»). No empezar ninguno sin él.
3. `development` → `main` solo con aprobación del usuario (hito estable).
4. El repositorio no tiene activada la fusión automática en GitHub: espera a la CI (`gh pr checks <n> --watch`) y fusiona a mano.

## M2: qué contiene

- Rutas localizadas en `packages/shared/src/site/public-routes.ts` (`publicPath`, `pageFromSlug`), resueltas en `apps/web/src/pages/public-page-route.tsx`.
- Páginas en `apps/web/src/pages/`: `home`, `menu` (desde `GET /api/v1/menu`), `story` (lorem), `contact` (mapa local, ADR 0011), `imprint` y `privacy`. Las páginas legales están en **de y es** y el usuario lo confirmó así.
- Componentes públicos en `apps/web/src/components/public/`: `SiteHeader`, `SiteFooter`, `WovenStripe`, `ReserveButton`, `Photo`, `PageHeader`, `ProvisionalMark`, `usePageMeta`, `useLang` y `styles.ts`.
- **Botón Reservar**: se controla con `RESERVATIONS_MODE` en `public-routes.ts`. Hoy vale `'phone'` (abre `tel:`). En la fase 7 se cambia a `'form'` y se añade la página `reservations` en `public-page-route.tsx`; la ruta `/de/reservieren` · `/es/reservar` ya está reservada.
- **Datos del restaurante**: `packages/shared/src/restaurant/restaurant-info.ts` (`contactConfirmed`, el bloque `legal` con `LEGAL_PLACEHOLDER`, `legalHasPlaceholders()` y `contactIsProvisional()`). Para confirmar un dato se cambia ahí, y el aviso de provisional desaparece solo.
- **`npm run check:publish`** (en `apps/api/scripts/publish-check.ts` y `apps/api/src/publish/`): falla mientras quede algo provisional. Hoy falla a propósito. Tiene que estar en verde antes de publicar y no forma parte de `check:all`.

## Pendiente (detalle en `docs/pendientes.md`)

- **Lo que debe dar el restaurante**: teléfono, email, horario, datos del Impressum, autoridad de hostelería, hosting, texto de la historia, revisión jurídica de los textos legales y los 36 platos marcados como provisionales.
- **Lo que pidió el usuario**:
  - Quitar las fotos del **PDF de la carta**: se montan unas sobre otras y aumentan el peso.
  - **Revisar el diseño en distintos dispositivos**: no le convence. Su referencia es muchosmas.eu/la-historia, con bloques de texto y foto alternos y foto de fondo.
- **Técnico**:
  - 5 fotos de platos no están en `apps/api/uploads` (entorno local): hay que volver a subirlas desde `/admin`.
  - Cuadrar la Datenschutzerklärung con la configuración de nginx.
  - Causa y quinua solo tienen versión de 640 px.
  - Hay 3 avisos de lint antiguos en los componentes de shadcn.

## Decisiones tomadas (no reabrir sin ADR)

- ADR 0010: dirección visual «Selva + manta», fuentes alojadas en nuestro servidor y la franja tejida como único elemento distintivo.
- ADR 0011: mapa como imagen estática local; sin iframes y sin peticiones a terceros.
- El indicador «API-Status» ya no aparece en la web pública. Por eso se borró `e2e/loading-states.spec.ts`, con permiso del usuario; su cobertura sigue en `api-status.test.tsx` y en `e2e/public-menu.spec.ts`.

## Comandos útiles

```
npm run dev            # API :3000 + web :5173
npm run check:all      # obligatorio en verde antes de cerrar nada (~4 min)
npm run check:publish  # debe pasar antes de publicar (hoy falla a propósito)
npx tsx apps/api/scripts/optimize-public-images.ts   # vuelve a generar las fotos WebP públicas
```

## Forma de trabajar que funcionó

- Una rama `feat/...` por fase y una PR a `development`.
- La base común (rutas, patrones) la hace el agente principal. Cada página la hace un subagente Sonnet, en secuencia, porque comparten `common.json` y los specs e2e.
- `code-reviewer` y `security-privacy-reviewer` (Sonnet) revisan en paralelo, y después un subagente aplica las correcciones.
- Si un subagente deja procesos en segundo plano, hay que pararlos antes de ejecutar `check:all`: comparten los puertos 3100 y 5174.
