---
name: api-module
description: Crear o ampliar un módulo de la API de Pachamama (Express) siguiendo routes → controller → service → repository, con schemas Zod en packages/shared. Usar al añadir endpoints o un módulo de negocio nuevo (menu, reservations, food-orders, shop, news, media, opening-hours, staff).
---

# Módulo de API

Aplica las convenciones de `AGENTS.md` y `docs/architecture.md`. Requiere que exista `apps/api` (fase 2+).

## Pasos

1. **Schemas** en `packages/shared/src/<modulo>/`: schemas Zod de entrada (create/update/query) y tipos derivados (`z.infer`). Exportarlos desde el índice del paquete.
2. **Repository** `apps/api/src/modules/<modulo>/<modulo>.repository.ts`: solo acceso a BD, consultas parametrizadas, sin lógica de negocio.
3. **Service** `<modulo>.service.ts`: reglas de negocio y transiciones de estado (ver `docs/domain-flows.md`). Lanza `AppError` ante reglas incumplidas. Recalcula importes en el servidor.
4. **Controller** `<modulo>.controller.ts`: lee `req`, llama al service, responde. Sin lógica.
5. **Routes** `<modulo>.routes.ts`: público bajo `/api/v1/<recurso>`; admin con `requireAuth` + `requireRole(...)`. Siempre `validate(schema)`. Rate-limit en endpoints públicos de escritura.
6. Registrar el router en la app.
7. **Tests** con Vitest + Supertest: caso feliz, validación (400), sin sesión (401), rol insuficiente (403), transición de estado inválida.
8. Si hay tablas nuevas → seguir la skill `db-change`.
9. Documentar endpoints nuevos en `docs/api.md` (crear si no existe).
10. Verificar: `npm run typecheck`, `npm run lint`, `npm test`.
