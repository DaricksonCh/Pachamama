# Roadmap — Pachamama

Fuente de verdad del avance del proyecto. **Se actualiza al cerrar cada fase.**

Regla: cada fase termina con verificación → commit → push → actualizar este archivo, y **no se empieza la siguiente sin el visto bueno del usuario**.

## ⚠ Fecha límite: 01.12.2026

El restaurante **se queda sin página web ese día**. Prioridad absoluta: tener una web pública **publicada y funcionando** antes del 01.12. Todo lo que necesita base de datos y panel admin pasa a después de la entrega (plan aprobado el 2026-11-18).

## Hechas

| #   | Fase                         | Contenido                                                                                 |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| 0   | Auditoría de herramientas    | Node, npm, Git, VS Code y extensiones; proyecto fuera de OneDrive; repo GitHub; `gh`      |
| 1   | Repositorio y contexto de IA | `AGENTS.md`, `CLAUDE.md`, `docs/`, ADRs, `.mcp.json`, skills y subagentes                 |
| 2   | Andamiaje técnico            | Monorepo web + API + shared, `GET /api/v1/health`, i18n de/es, ESLint/Prettier/Vitest, CI |

## Entrega MVP (antes del 01.12.2026)

Sin base de datos: los contenidos viven en archivos del repo (JSON/Markdown por idioma).

| Bloque | Contenido                                                                                                          | Fechas orientativas | Estado      |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------- | ----------- |
| M1     | **Diseño**: dirección visual con `frontend-design` + webs de referencia; tokens en Tailwind; decidir shadcn        | 18–20.11            | ⏭ Siguiente |
| M2     | **Páginas públicas (de/es)**: Inicio, Menú, Historia, Contacto (horarios, dirección, mapa), Impressum, Datenschutz | 21–25.11            | Pendiente   |
| M3     | **Reservas por formulario**: email al restaurante + acuse al cliente; Zod, rate-limit, honeypot, consentimiento    | 26–27.11            | Pendiente   |
| M4     | **Despliegue**: hosting UE, dominio y DNS, HTTPS, SEO básico (prerender, sitemap), prueba final                    | 28–29.11            | Pendiente   |
| —      | Margen para imprevistos                                                                                            | 30.11               | —           |

**En paralelo desde ya (camino crítico):** elegir hosting y gestionar el dominio actual (DNS/transferencia).

## Después de la entrega

| #   | Fase                          | Contenido                                                                                   | Estado    |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------- | --------- |
| 3   | Base de datos y autenticación | MySQL 8.4, Kysely, migraciones, Better Auth + plugin admin, login de `/admin`, primer admin | Pendiente |
| 4   | Horarios y cierres            | Horario semanal y cierres editables desde el panel                                          | Pendiente |
| 5   | Menú en BD                    | Categorías, platos, precios, alérgenos, imágenes, traducciones; migrar el menú del MVP      | Pendiente |
| 6   | Noticias y avisos             | Publicaciones y avisos destacados desde el panel                                            | Pendiente |
| 7   | Reservas en BD                | Guardar reservas, gestión y confirmación desde el panel (sustituye al formulario por email) | Pendiente |
| 8   | Pedidos gastronómicos         | Pedido para recoger, franjas horarias, estados, emails                                      | Pendiente |
| 9   | Tienda                        | Productos, stock, compra para recoger                                                       | Pendiente |
| 10  | Multimedia                    | Galería de fotos y vídeos                                                                   | Pendiente |
| 11  | Contenidos editables          | Historia y textos legales editables desde el panel                                          | Pendiente |
| 12  | Producción madura             | Evaluar Docker, backups, monitorización                                                     | Pendiente |

## Información necesaria del restaurante (urgente)

- [ ] Dominio actual y quién lo gestiona (acceso a DNS o transferencia)
- [ ] Carta: platos, precios, alérgenos (de/es)
- [ ] Horarios, dirección, teléfono, email
- [ ] Logo y fotos
- [ ] Texto de la historia
- [ ] Datos del Impressum: razón social, titular, dirección, USt-IdNr.
- [ ] Email que recibe las reservas
- [ ] 2–3 webs de referencia para el diseño

## Decisiones pendientes

**MVP**

- Hosting en la UE (web estática + API Node pequeña) y proveedor de email (SMTP con contrato AVV).
- Herramienta de prerender/SEO para la SPA.
- shadcn/ui sí o no (según el diseño).
- Anti-bot del formulario (honeypot + rate-limit; Turnstile opcional).

**Fase 3**

- ✅ Base de datos: **MySQL 8.4 LTS Community** en local (puerto 3307), base `pachamama` con usuario propio.
- Capa de datos: **Kysely + mysql2** (recomendada: misma base que Better Auth).
- Confirmar `disableSignUp` en Better Auth (solo el admin crea usuarios).

**Más adelante**

- Docker · almacenamiento de imágenes/vídeos · franjas y límites de pedidos · reservas con confirmación manual vs. aforo automático · roles definitivos · plazo de retención de datos.

## Historial

| Fecha      | Hito                                                                                                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | Fase 0: plan de arquitectura y auditoría de herramientas aprobados. Repo GitHub creado.                                                                                                                                                      |
| 2026-11-18 | Proyecto movido fuera de OneDrive a `C:\claude-code`. Fase 1 completada.                                                                                                                                                                     |
| 2026-11-18 | Flujo de ramas `main` + `development` + `feat/*`. find-skills instalado; herramientas de IA documentadas en `docs/tooling.md`.                                                                                                               |
| 2026-11-18 | Skills globales y de proyecto instaladas (frontend, backend, BD, Superpowers); subagentes `code-reviewer` y `qa-tester`. Diseño: se creará con `frontend-design` + referencias (Figma opcional).                                             |
| 2026-11-18 | Fase 2 completada: monorepo (web + API + shared), `GET /api/v1/health`, i18n de/es, ESLint/Prettier/Vitest, CI de GitHub Actions.                                                                                                            |
| 2026-11-18 | MySQL 8.4.13 instalado (puerto 3307, junto a MariaDB de XAMPP). Plan MVP aprobado: web pública publicada antes del 01.12; BD y panel después.                                                                                                |
| 2026-11-21 | Skills de QA, seguridad (OWASP), DSGVO, rendimiento y formularios. Pruebas: Playwright e2e (escritorio + móvil), axe WCAG 2.2 AA, skeleton loader, tests de seguridad de la API, `db:check`. Regla: no cerrar nada sin `check:all` en verde. |
