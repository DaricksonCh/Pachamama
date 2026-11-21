# 0007 — Capa de datos: Kysely + mysql2

- **Fecha:** 2026-11-21
- **Estado:** Aceptada

## Contexto

La fase 3 necesita una capa de datos para MySQL 8.4. El ADR 0001 dejó la elección entre Kysely y Prisma para esta fase. Requisitos: SQL explícito y seguro (consultas parametrizadas), tipos TypeScript estrictos, **un solo sistema de migraciones** para todo (incluidas las tablas de Better Auth) y poco peso en el servidor.

## Decisión

- **Kysely** (query builder tipado) sobre el driver **mysql2** (pool de conexiones).
- Migraciones con el `Migrator` de Kysely: archivos TypeScript en `apps/api/src/db/migrations/`, con `up` y `down`, ordenados por fecha (`AAAA_MM_DD_NNN_nombre.ts`).
- **Better Auth usa el mismo Kysely** (adaptador integrado). Sus tablas (`users`, `sessions`, `accounts`, `verifications`) se crean con nuestras migraciones, no con la CLI de Better Auth, y siguen nuestra convención: `snake_case` y plural.
- `CamelCasePlugin` de Kysely: en TypeScript las columnas se escriben en `camelCase` y en MySQL en `snake_case`.
- Los tipos de las tablas se escriben a mano en `apps/api/src/db/types.ts` (fuente única, revisable en el diff).

## Alternativas consideradas

- **Prisma**: genera cliente y migraciones, pero añade un motor y un esquema propio (`schema.prisma`). Better Auth y Prisma tendrían dos fuentes de verdad, y el SQL queda menos visible.
- **Drizzle**: descartado en el ADR 0001.
- **CLI de Better Auth (`auth migrate`)**: crearía un segundo sistema de migraciones, lo que va contra la regla de `db-change`.

## Consecuencias

- SQL predecible y fácil de revisar; consultas parametrizadas por defecto (sin inyección SQL).
- Hay que mantener a mano los tipos de `types.ts` en sincronía con las migraciones. Lo comprueba un test de integración que valida el esquema real.
- Si Better Auth o sus plugins añaden columnas en una versión nueva, hace falta una migración nueva. Se nota porque los tests de auth fallan.
