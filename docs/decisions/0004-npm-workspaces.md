# 0004 — Monorepo con npm workspaces

- **Fecha:** 2026-11-10
- **Estado:** Aceptada

## Contexto
Web y API comparten validaciones y tipos (formularios ↔ endpoints).

## Decisión
Un solo repositorio con **npm workspaces**: `apps/web`, `apps/api`, `packages/shared` (paquetes `@pachamama/*`).

## Alternativas consideradas
- **pnpm / Turborepo / Nx** — más potentes, pero innecesarios a este tamaño; npm ya viene con Node.
- **Dos repositorios** — duplicaría schemas y tipos.

## Consecuencias
- Schemas Zod definidos una vez y usados en ambos lados.
- Un solo `npm install`, un solo CI.
