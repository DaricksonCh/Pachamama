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
- Fase 3 hecha: Kysely + migraciones, Better Auth (login del personal en `/admin`, roles admin/staff). Diseño de la web provisional.
- **⚠ Fecha límite 01.12.2026** (el restaurante no tiene web): plan revisado el 2026-11-21. Primero BD + login admin (fase 3) y carta editable desde el panel (fase 5), con el diseño en paralelo; después páginas públicas y publicación. Detalle en `docs/roadmap.md`.

## Forma de trabajar (obligatorio)

- **Fase por fase.** No empezar una fase sin el visto bueno explícito del usuario.
- No escribir código ni tocar la base de datos fuera de la fase aprobada.
- Antes de una decisión técnica importante, proponer y esperar aprobación; después, registrarla en `docs/decisions/` (ADR).
- Cada fase termina con: verificación → commit → push → actualizar `docs/roadmap.md`.
- **No terminar hasta que todas las pruebas hayan sido superadas con éxito.** Ninguna tarea, fase o fusión se da por hecha hasta que `npm run check:all` está en verde (y `npm run db:check` si toca la BD). Si algo falla, se arregla la causa y se vuelve a ejecutar todo; nunca se borra, salta ni debilita un test para que pase. Cada cambio incluye los tests que exige [`docs/testing.md`](docs/testing.md).
- Comunicación con el usuario en **español**. Código, nombres de variables y commits en **inglés**.

## Git: ramas y flujo

```
main           ← producción (estable)
 └ development ← integración y pruebas
    └ feat/<tema>, fix/<tema>, docs/<tema>   ← ramas cortas, una por fase o tarea
```

- Nunca trabajar directamente en `main` ni en `development`.
- Cada fase o tarea: crear `feat/...` desde `development` → commits → fusionar en `development` (Pull Request cuando `gh` esté disponible) → borrar la rama.
- `development` → `main` solo cuando el usuario lo apruebe (hito estable).
- El agente puede hacer commits y push por sí mismo (autorizado por el usuario).
- Ejemplos de nombre: `feat/fase-2-andamiaje`, `feat/menu`, `fix/reserva-fecha`.

## Herramientas de IA

Listado, alcance (global o de proyecto) y estado: [`docs/tooling.md`](docs/tooling.md).

## Subagentes

Para trabajo extenso, el agente principal delega en subagentes (cada uno trabaja con contexto propio y devuelve un resumen):

| Cuándo                                                        | Cómo                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Ejecutar un plan con tareas independientes                    | Skill `subagent-driven-development` (un subagente por tarea + revisión entre tareas) |
| 2+ tareas sin dependencias entre sí                           | Skill `dispatching-parallel-agents` (en paralelo)                                    |
| Revisar una rama antes de fusionar en `development`           | Subagente del proyecto `code-reviewer` (`.claude/agents/`)                           |
| Verificar una fase (typecheck, lint, tests, build, navegador) | Subagente del proyecto `qa-tester`                                                   |
| Formularios, datos personales, auth, páginas legales, deploy  | Subagente del proyecto `security-privacy-reviewer` (OWASP + DSGVO)                   |
| Buscar en mucho código                                        | Subagente integrado `Explore`                                                        |

Reglas: un subagente que **escribe** código nunca comparte archivos con otro en paralelo; los de revisión/QA solo leen y reportan; el agente principal comprueba siempre el resultado antes de darlo por hecho.

## Skills obligatorias por tipo de tarea

Antes de empezar una tarea, el agente **consulta (carga) las skills que le corresponden** según esta tabla, aunque el usuario no las nombre, y al terminar indica cuáles usó. Las skills globales (`~/.claude/skills/`) y las del proyecto (`.claude/skills/`) están disponibles en todas las sesiones. Si una tarea encaja en varias filas, se usan todas.

| Tarea                                              | Skills a consultar                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Planificar una fase o funcionalidad nueva          | `brainstorming`, `writing-plans`                                                                                                  |
| Diseño visual, maquetación, tokens, componentes UI | `frontend-design`, `tailwind-design-system`, `web-design-guidelines`, `accessibility`, `shadcn`                                   |
| Páginas o funcionalidades del frontend             | `web-feature`, `vercel-react-best-practices`, `tanstack-query-best-practices`, `loading-states`, `accessibility`                  |
| Formularios (reservas, pedidos, contacto, login)   | `react-hook-form`, `owasp-security`, `gdpr-dsgvo-expert`, `accessibility`                                                         |
| Endpoints o módulos de la API                      | `api-module`, `nodejs-backend-patterns`, `owasp-security`                                                                         |
| Base de datos: esquema, migraciones, consultas     | `db-change`, `mysql`                                                                                                              |
| Autenticación y panel admin                        | `better-auth-best-practices`, `better-auth-security-best-practices`, `email-and-password-best-practices`, `shadcn`, `web-feature` |
| Datos personales, cookies, textos legales (DSGVO)  | `gdpr-dsgvo-expert`, `gdpr-data-handling`                                                                                         |
| Escribir tests                                     | `testing-strategy`, `test-driven-development`, `vitest`, `playwright-best-practices`, `e2e-testing-patterns`                      |
| Probar la web en el navegador                      | `webapp-testing`, `playwright-cli`                                                                                                |
| SEO, rendimiento, auditoría antes de publicar      | `seo`, `performance`, `core-web-vitals`, `best-practices`, `web-quality-audit`                                                    |
| Configurar Vite                                    | `vite`                                                                                                                            |
| Un bug o un test que falla                         | `systematic-debugging`                                                                                                            |
| Antes de decir "terminado" o hacer commit          | `verification-before-completion`                                                                                                  |
| Revisión de código y cierre de rama                | `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch`                                               |
| Trabajo extenso o tareas en paralelo               | `subagent-driven-development`, `dispatching-parallel-agents`                                                                      |
| Buscar una skill que falte                         | `find-skills` (verificar la fuente antes de instalar; documentar en `docs/tooling.md` y añadirla a esta tabla)                    |

## Diseño

Todavía no hay diseño definitivo en Figma (plan gratuito, MCP muy limitado). El diseño puede crearse con la skill `frontend-design`, tomando como referencia webs que indique el usuario; si más adelante llega un Figma, este manda. Los tokens de diseño (colores, tipografías, espaciados) se centralizan en la configuración de Tailwind.

## Stack (decidido — no cambiar sin ADR nuevo)

| Capa          | Tecnología                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Frontend      | React + Vite, TypeScript, React Router, TanStack Query, react-hook-form, Tailwind CSS + shadcn/ui, react-i18next |
| Backend       | Node.js + Express 5 (ESM), TypeScript, Zod, helmet, cors, express-rate-limit, pino                               |
| Base de datos | MySQL 8.4 + **Kysely** (mysql2, migraciones de Kysely; ADR 0007)                                                 |
| Autenticación | Better Auth + plugin `admin` (roles `admin`, `staff`)                                                            |
| Monorepo      | npm workspaces (sin pnpm)                                                                                        |
| Tests         | Vitest, Supertest, Playwright                                                                                    |

**Descartado:** Next.js, Prisma, Drizzle, Docker en desarrollo (se evaluará al desplegar), pasarelas de pago, CMS externo.

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

Desde la raíz del repo:

| Comando                                            | Qué hace                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm install`                                      | Instala dependencias de todos los paquetes                                   |
| `npm run dev`                                      | API en http://localhost:3000 + web en http://localhost:5173 (proxy)          |
| `npm run typecheck`                                | TypeScript en todos los paquetes                                             |
| `npm run lint`                                     | ESLint                                                                       |
| `npm run format`                                   | Prettier (escribe) · `npm run format:check` solo comprueba                   |
| `npm test`                                         | Vitest en todos los paquetes                                                 |
| `npm run build`                                    | Build de producción (API con tsup, web con Vite)                             |
| `npm run check`                                    | typecheck + lint + formato + tests unitarios                                 |
| `npm run test:e2e`                                 | Flujos de usuario en navegador (Playwright, escritorio y móvil)              |
| `npm run check:all`                                | `check` + build + e2e: **obligatorio en verde antes de cerrar**              |
| `npm run db:check`                                 | Comprueba la BD local (versión, utf8mb4, mínimo privilegio)                  |
| `npm run db:migrate`                               | Aplica las migraciones pendientes (`db:migrate:down` deshace una)            |
| `npm run db:cleanup`                               | Borra sesiones y verificaciones caducadas (DSGVO; cron diario en producción) |
| `npm run admin:create -- --email <e> --name "<n>"` | Crea un admin (pide la contraseña sin mostrarla)                             |
| `npm run dev -w @pachamama/api`                    | Solo un paquete (`-w` = workspace)                                           |

Versiones fijadas: Node 24, npm 11, **TypeScript 6.0** (TS 7 aún no es compatible con typescript-eslint; ver ADR 0006).

## Documentación

| Archivo                                                | Contenido                                      |
| ------------------------------------------------------ | ---------------------------------------------- |
| [`docs/roadmap.md`](docs/roadmap.md)                   | Fases, estado y decisiones pendientes          |
| [`docs/architecture.md`](docs/architecture.md)         | Arquitectura técnica                           |
| [`docs/domain-flows.md`](docs/domain-flows.md)         | Reservas, pedidos y tienda: estados y reglas   |
| [`docs/security-privacy.md`](docs/security-privacy.md) | Seguridad y DSGVO                              |
| [`docs/testing.md`](docs/testing.md)                   | Estrategia de pruebas y qué exige cada cambio  |
| [`docs/api.md`](docs/api.md)                           | Endpoints, accesos y códigos de error          |
| [`docs/mcp.md`](docs/mcp.md)                           | Cómo añadir servidores MCP en cada herramienta |
| [`docs/decisions/`](docs/decisions/)                   | Registro de decisiones (ADR)                   |

## Entorno del desarrollador

Windows 11, Node.js 24 LTS, npm 11, Git, VS Code. Base de datos del proyecto: **MySQL 8.4 Community**, servicio `MySQL84`, puerto **3307**, base `pachamama` con usuario propio (credenciales solo en `.env`). Ojo: el servicio `mysql` del puerto 3306 es MariaDB de XAMPP con otros proyectos del usuario: **no tocarlo**. `MySQL80` es un servicio huérfano deshabilitado. El proyecto vive en `C:\claude-code` (fuera de OneDrive a propósito: OneDrive bloquea `node_modules`).
