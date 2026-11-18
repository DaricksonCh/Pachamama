# 0003 — Autenticación con Better Auth

- **Fecha:** 2026-11-10
- **Estado:** Aceptada

## Contexto
Solo el personal inicia sesión (panel `/admin`); los clientes no tienen cuenta. Se necesitan roles (`admin`, `staff`) y alta de usuarios solo por un admin.

## Decisión
**Better Auth** con su plugin `admin`, montado en Express y conectado a MySQL.

Compatibilidad verificada en la documentación oficial:
- Express: `toNodeHandler(auth)` de `better-auth/node`; en Express 5, `app.all("/api/auth/*splat", ...)`, montado **antes** de `express.json()`.
- Solo ESM ⇒ `apps/api` con `"type": "module"`.
- MySQL: pool de `mysql2/promise` pasado como `database` (usa Kysely internamente). Usar `timezone: "Z"`.
- Migraciones de sus tablas (`user`, `session`, `account`, `verification`) con su CLI.
- Sesión en rutas propias: `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`.

## Alternativas consideradas
- **express-session + argon2** (propuesta inicial) — más código propio de seguridad que mantener.
- **Passport** — más antiguo y de más bajo nivel.

## Consecuencias
- Sesiones, hashing y roles resueltos por una librería mantenida.
- Fuerza ESM en el backend.
- Pendiente (fase 3): verificar `disableSignUp` y elegir capa de datos coherente (Kysely recomendado, misma base que Better Auth).
