# Roadmap — Pachamama

Fuente de verdad del avance del proyecto. **Se actualiza al cerrar cada fase.**

Regla: cada fase termina con verificación → commit → push → actualizar este archivo, y **no se empieza la siguiente sin el visto bueno del usuario**.

## Fases

| #   | Fase                          | Contenido                                                                                                                                                                                            | Estado      |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 0   | Auditoría de herramientas     | Node, npm, Git, VS Code y extensiones; proyecto fuera de OneDrive; repo GitHub                                                                                                                       | ✅ Hecha    |
| 1   | Repositorio y contexto de IA  | `AGENTS.md`, `CLAUDE.md`, `docs/`, ADRs, `.mcp.json` vacío, skills, configuración base                                                                                                               | ✅ Hecha    |
| 2   | Andamiaje técnico             | npm workspaces (`apps/web`, `apps/api`, `packages/shared`), Vite + React + Tailwind (shadcn pendiente del diseño), Express 5 ESM, ESLint/Prettier/Vitest, CI en GitHub Actions, `GET /api/v1/health` | ✅ Hecha    |
| 3   | Base de datos y autenticación | Instancia MySQL, capa de datos (Kysely o Prisma), migraciones, Better Auth + plugin admin, login de `/admin`, primer admin                                                                           | ⏭ Siguiente |
| 4   | Horarios y cierres            | Horario semanal, días cerrados/festivos (base para reservas y pedidos)                                                                                                                               | Pendiente   |
| 5   | Menú                          | Categorías, platos, precios, alérgenos, imágenes, traducciones                                                                                                                                       | Pendiente   |
| 6   | Noticias y avisos             | Publicaciones y avisos destacados desde el panel                                                                                                                                                     | Pendiente   |
| 7   | Reservas                      | Formulario, gestión en panel, emails al cliente y al personal                                                                                                                                        | Pendiente   |
| 8   | Pedidos gastronómicos         | Pedido para recoger, franjas horarias, estados, emails                                                                                                                                               | Pendiente   |
| 9   | Tienda                        | Productos, stock, compra para recoger                                                                                                                                                                | Pendiente   |
| 10  | Multimedia                    | Galería de fotos y vídeos                                                                                                                                                                            | Pendiente   |
| 11  | Historia y páginas legales    | Historia, Impressum, Datenschutz, cookies (de + es)                                                                                                                                                  | Pendiente   |
| 12  | Despliegue                    | Hosting en la UE, evaluar Docker, dominio, SEO (prerender), backups                                                                                                                                  | Pendiente   |

El orden de las fases 4–11 puede cambiar si el usuario lo prioriza.

## Decisiones pendientes

**Fase 2**

- ✅ GitHub CLI instalado (falta `gh auth login`). shadcn/ui: se decide con el diseño.

**Fase 3**

- Capa de datos: **A. Kysely + mysql2** (recomendada: misma base que Better Auth) o **B. Prisma**.
- Qué servicio MySQL usar (`mysql` o `MySQL80`) y versión ≥ 8.0.
- Confirmar `disableSignUp` en Better Auth (solo el admin crea usuarios).

**Más adelante**

- Diseño visual: crear con `frontend-design` a partir de webs de referencia (Figma gratuito, MCP limitado) · hosting UE y Docker · herramienta de prerender SEO · almacenamiento de imágenes/vídeos · país y moneda · SMTP · anti-bot (p. ej. Turnstile) · franjas y límites de pedidos · reservas con confirmación manual vs. aforo automático · lista de alérgenos · roles definitivos · plazo de retención de datos · identidad visual y contenidos.

## Historial

| Fecha      | Hito                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-10 | Fase 0: plan de arquitectura y auditoría de herramientas aprobados. Repo GitHub creado.                                                                                                          |
| 2026-11-18 | Proyecto movido fuera de OneDrive a `C:\claude-code`. Fase 1 completada.                                                                                                                         |
| 2026-11-18 | Flujo de ramas `main` + `development` + `feat/*`. find-skills instalado; herramientas de IA documentadas en `docs/tooling.md`.                                                                   |
| 2026-11-18 | Skills globales y de proyecto instaladas (frontend, backend, BD, Superpowers); subagentes `code-reviewer` y `qa-tester`. Diseño: se creará con `frontend-design` + referencias (Figma opcional). |
| 2026-11-18 | Fase 2 completada: monorepo (web + API + shared), `GET /api/v1/health`, i18n de/es, ESLint/Prettier/Vitest, CI de GitHub Actions.                                                                |
