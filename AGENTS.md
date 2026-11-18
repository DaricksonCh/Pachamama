# AGENTS.md — Pachamama

Contexto para cualquier agente de IA (Claude Code, Codex, Cursor, Copilot…) y para cualquier persona que trabaje en este repo. **Léelo entero antes de hacer cambios.**

## Qué es

Web del restaurante **Pachamama** (comida peruana). Contenido público (inicio, menú, historia, noticias, multimedia) y tres procesos **distintos** que no se deben mezclar:

1. **Reservas** de mesa.
2. **Pedidos gastronómicos** (comida para recoger).
3. **Compras en la tienda** (productos, con stock).

Todo se paga **en el local** (sin pasarela de pagos). El personal gestiona todo desde un **panel admin propio** (`/admin`). Idiomas: **alemán (por defecto) y español** → aplica **DSGVO/RGPD**.

## Estado actual

- Fase en curso y siguientes: ver [`docs/roadmap.md`](docs/roadmap.md). **Actualízalo al terminar cada fase.**
- Todavía **no hay código de aplicación**: solo documentación y configuración (fase 1).

## Forma de trabajar (obligatorio)

- **Fase por fase.** No empezar una fase sin el visto bueno explícito del usuario.
- No escribir código ni tocar la base de datos fuera de la fase aprobada.
- Antes de una decisión técnica importante, proponer y esperar aprobación; después, registrarla en `docs/decisions/` (ADR).
- Cada fase termina con: verificación (typecheck, lint, tests, build cuando existan) → commit → push → actualizar `docs/roadmap.md`.
- Comunicación con el usuario en **español**. Código, nombres de variables y commits en **inglés**.

## Stack (decidido — no cambiar sin ADR nuevo)

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite, TypeScript, React Router, TanStack Query, react-hook-form, Tailwind CSS + shadcn/ui, react-i18next |
| Backend | Node.js + Express 5 (ESM), TypeScript, Zod, helmet, cors, express-rate-limit, pino |
| Base de datos | MySQL 8 (capa de datos: Kysely o Prisma, se decide en fase 3) |
| Autenticación | Better Auth + plugin `admin` (roles `admin`, `staff`) |
| Monorepo | npm workspaces (sin pnpm) |
| Tests | Vitest, Supertest, Playwright |

**Descartado:** Next.js, Drizzle, Docker en desarrollo (se evaluará al desplegar), pasarelas de pago, CMS externo.

## Estructura (objetivo tras fase 2)

```
apps/web/          # @pachamama/web  — React + Vite (sitio público + /admin)
apps/api/          # @pachamama/api  — Express (API REST /api/v1, auth en /api/auth)
packages/shared/   # @pachamama/shared — schemas Zod y tipos compartidos
docs/              # arquitectura, flujos, seguridad, MCP, decisiones, roadmap
.claude/skills/    # recetas para tareas repetibles
```

## Convenciones

- **TypeScript strict**, solo `.ts` / `.tsx`. Sin `any` salvo justificación en comentario.
- Backend por módulos: `routes → controller → service → repository`. La lógica de negocio va en `service`; el SQL solo en `repository`.
- Todo input externo se valida con **Zod**; los schemas viven en `packages/shared` y los usan web y API.
- Rutas: API pública en `/api/v1/...`; endpoints admin con `requireAuth` + `requireRole`.
- Textos visibles siempre traducidos (claves i18n, `de` y `es`); nunca texto fijo en componentes.
- Fechas en UTC en BD y API; se convierten a la zona del restaurante solo en la UI.
- Secretos solo en `.env` (ver `.env.example`). Nunca en el código ni en el repo.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`…).

## Comandos

Se añadirán en la fase 2 (`npm install`, `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`).

## Documentación

| Archivo | Contenido |
|---|---|
| [`docs/roadmap.md`](docs/roadmap.md) | Fases, estado y decisiones pendientes |
| [`docs/architecture.md`](docs/architecture.md) | Arquitectura técnica |
| [`docs/domain-flows.md`](docs/domain-flows.md) | Reservas, pedidos y tienda: estados y reglas |
| [`docs/security-privacy.md`](docs/security-privacy.md) | Seguridad y DSGVO |
| [`docs/mcp.md`](docs/mcp.md) | Cómo añadir servidores MCP en cada herramienta |
| [`docs/decisions/`](docs/decisions/) | Registro de decisiones (ADR) |

## Entorno del desarrollador

Windows 11, Node.js 24 LTS, npm 11, Git, VS Code. MySQL instalado como servicio de Windows (hay dos servicios, `mysql` y `MySQL80`; cuál se usa se decide en fase 3). El proyecto vive en `C:\claude-code` (fuera de OneDrive a propósito: OneDrive bloquea `node_modules`).
