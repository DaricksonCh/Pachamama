# Arquitectura — Pachamama

## Visión general

```
Navegador ──► apps/web (React + Vite, SPA)
                 │  fetch /api/...  (en dev: proxy de Vite → mismo origen, cookies sin CORS)
                 ▼
              apps/api (Express 5)
                 ├── /api/auth/*   → Better Auth (sesiones, login, usuarios)
                 └── /api/v1/*     → módulos de negocio
                 ▼
              MySQL 8
```

`packages/shared` contiene los **schemas Zod** y tipos que comparten web y API: el mismo schema valida el formulario en el navegador y el body en el servidor.

## Monorepo (npm workspaces)

| Paquete             | Ruta              | Rol                                             |
| ------------------- | ----------------- | ----------------------------------------------- |
| `@pachamama/web`    | `apps/web`        | Sitio público + panel `/admin`                  |
| `@pachamama/api`    | `apps/api`        | API REST + autenticación                        |
| `@pachamama/shared` | `packages/shared` | Schemas Zod, tipos, constantes (estados, roles) |

## Frontend (`apps/web`)

- React + Vite + TypeScript, **React Router** (rutas públicas y `/admin/*` protegidas).
- **TanStack Query** para datos del servidor (caché, reintentos, invalidación).
- **react-hook-form** + `zodResolver` con schemas de `shared`.
- **Tailwind CSS + shadcn/ui** para la interfaz; diseño responsive mobile-first.
- **react-i18next**: `de` (por defecto) y `es`; rutas con prefijo de idioma (`/de/...`, `/es/...`).
- SEO: al ser SPA, las páginas públicas se **prerenderizan** (herramienta a decidir en fase 12).

## Backend (`apps/api`)

- Express 5, **ESM** (`"type": "module"`, requisito de Better Auth).
- Orden de middlewares: `helmet` → `cors` → **Better Auth** (`app.all("/api/auth/*splat", toNodeHandler(auth))`, **antes** de `express.json()`) → `express.json()` → rate-limit → rutas `/api/v1` → manejador de errores.
- Cada módulo sigue `routes → controller → service → repository`:
  - **routes**: URL, middlewares (`validate(schema)`, `requireAuth`, `requireRole`).
  - **controller**: traduce HTTP ↔ service. Sin lógica de negocio.
  - **service**: reglas de negocio y transiciones de estado.
  - **repository**: único lugar con acceso a BD.
- Errores con una clase `AppError` (código, status HTTP, mensaje i18n) y un manejador central. Respuestas de error con formato uniforme.
- Logs con **pino** (sin datos personales en los logs).

### Módulos

| Módulo          | Público                | Admin                                        |
| --------------- | ---------------------- | -------------------------------------------- |
| `opening-hours` | Ver horario y cierres  | Editar                                       |
| `menu`          | Ver carta              | CRUD categorías y platos                     |
| `news`          | Ver noticias/avisos    | CRUD                                         |
| `reservations`  | Crear reserva          | Listar, confirmar, rechazar, cerrar          |
| `food-orders`   | Crear pedido           | Listar y cambiar estado                      |
| `shop`          | Ver productos, comprar | CRUD productos, stock, pedidos               |
| `media`         | Ver galería            | Subir/borrar                                 |
| `auth`          | — (login)              | Better Auth                                  |
| `staff`         | —                      | Alta/baja de usuarios y roles (solo `admin`) |

## Autenticación (Better Auth)

- Adaptador MySQL: pool de `mysql2/promise` (`timezone: "Z"`).
- Plugin `admin()` con roles **`admin`** (todo) y **`staff`** (operación diaria). Sin registro público: los usuarios los crea un admin.
- Sesión en rutas propias: `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })` → middlewares `requireAuth` / `requireRole`.
- Cookies `httpOnly`, `secure` (en producción), `sameSite=lax`.
- Detalle y alternativas: [ADR 0003](decisions/0003-better-auth.md).

## Base de datos

- MySQL 8, `utf8mb4`, fechas en UTC.
- Capa de datos y migraciones: **se decide en fase 3** (Kysely recomendado, ver roadmap).
- Un solo sistema de migraciones para tablas de Better Auth y propias.

## Flujo típico (ej. reserva)

Formulario (schema `shared`) → TanStack Query → `POST /api/v1/reservations` → rate-limit + `validate` → service (comprueba horario, crea en `pending`) → repository → MySQL → email al personal y acuse al cliente → el personal confirma desde `/admin` → email de confirmación.

Estados y reglas de cada proceso: [domain-flows.md](domain-flows.md).

## Entornos

| Entorno    | Cómo                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| Desarrollo | `npm run dev` (web en :5173 con proxy a API en :3000), MySQL local, sin Docker |
| Producción | Hosting en la UE (a decidir en fase 12); Docker se evalúa entonces             |
