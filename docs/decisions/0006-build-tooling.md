# 0006 — Herramientas de build, calidad y versiones (fase 2)

- **Fecha:** 2026-11-18
- **Estado:** Aceptada

## Contexto

La fase 2 crea el andamiaje técnico del monorepo. Hay que elegir cómo se ejecuta y compila cada paquete y fijar versiones compatibles entre sí.

## Decisión

| Tema                 | Elección                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| TypeScript           | **6.0.x** fijado. TS 7 (nativo) aún no es compatible con typescript-eslint (`typescript <6.1`)         |
| Módulos              | ESM en todo el repo, `moduleResolution: bundler`, `verbatimModuleSyntax`                               |
| `packages/shared`    | Se publica como **código TypeScript** (sin build propio): lo consumen Vite y tsx directamente          |
| API en desarrollo    | **tsx watch**                                                                                          |
| API en producción    | **tsup** (un único bundle ESM para Node 24, con `@pachamama/shared` incluido)                          |
| Variables de entorno | `process.loadEnvFile` nativo de Node + validación con Zod (`apps/api/src/config/env.ts`); sin `dotenv` |
| Logs                 | pino + pino-http (pino-pretty solo en desarrollo); cookies y cabecera `authorization` ocultas          |
| Web                  | Vite 8 + React 19 + React Router (modo librería, `createBrowserRouter`) + TanStack Query               |
| Estilos              | Tailwind CSS 4 con `@tailwindcss/vite`; tokens en `@theme` de `src/index.css` (provisionales)          |
| shadcn/ui            | **No se inicializa todavía**: se decide cuando exista el diseño                                        |
| i18n                 | react-i18next; idioma en la URL (`/de`, `/es`); idiomas definidos en `@pachamama/shared`               |
| Lint y formato       | ESLint 10 (flat config) + typescript-eslint + react-hooks; Prettier con plugin de Tailwind             |
| Tests                | Vitest en cada paquete; Supertest en la API; Testing Library + jsdom en la web                         |
| CI                   | GitHub Actions: typecheck, lint, formato, tests, build y `npm audit` de dependencias de producción     |

## Alternativas consideradas

- **TypeScript 7** — más rápido, pero rompe el lint hoy. Se revisará cuando typescript-eslint lo soporte.
- **Compilar `shared` a `dist/`** — añade un paso de build y watch extra sin beneficio a este tamaño.
- **dotenv** — innecesario: Node 24 lee `.env` de forma nativa.
- **React Router en modo framework** — acerca el proyecto a un framework SSR; se prefiere la SPA simple acordada (ADR 0001).

## Consecuencias

- Un solo `npm run dev` levanta todo; la web usa el proxy de Vite (`/api` → `:3000`), así las cookies de sesión funcionarán sin CORS en desarrollo.
- El bundle inicial de la web (~150 kB gzip) se optimizará con carga diferida de rutas cuando haya más páginas.
- `npm audit` muestra avisos en dependencias **solo de desarrollo** (p. ej. `picomatch`); la CI solo bloquea vulnerabilidades altas en dependencias de producción.
