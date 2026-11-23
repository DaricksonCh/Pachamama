# Herramientas de IA — Pachamama

Qué plugins, skills, subagentes y servidores MCP usa el proyecto, de dónde vienen y dónde están instalados.

## Global vs. proyecto

| Alcance              | Dónde vive                                                                       | Qué va ahí                                                  |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Global (usuario)** | `~/.claude/` (plugins, `~/.claude/skills/`, MCP con `--scope user`)              | Herramientas generales útiles en cualquier proyecto         |
| **Proyecto**         | Este repo: `.claude/skills/`, `.claude/agents/`, `.mcp.json`, `skills-lock.json` | Lo específico de Pachamama (stack concreto, reglas propias) |

Regla: **no instalar lo mismo en los dos sitios**. Lo global se documenta aquí para poder reinstalarlo en otra máquina.

Criterio de selección: fuente oficial (Anthropic, el fabricante de la herramienta o un mantenedor del propio framework) y uso amplio (miles de instalaciones). Las skills de proyecto quedan fijadas a un commit en `skills-lock.json`.

## Skills globales (`~/.claude/skills/`)

| Skill                                                           | Fuente                                                                                                          | Área          | Para qué                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| find-skills                                                     | [vercel-labs/skills](https://github.com/vercel-labs/skills)                                                     | Meta          | Buscar e instalar skills (skills.sh)                                      |
| frontend-design                                                 | [anthropics/skills](https://github.com/anthropics/skills)                                                       | Diseño        | Dirección visual cuidada, no genérica                                     |
| webapp-testing                                                  | anthropics/skills                                                                                               | Frontend / QA | Probar la web local con Playwright                                        |
| vercel-react-best-practices                                     | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)                                         | Frontend      | Rendimiento en React (ignorar reglas de Next.js)                          |
| web-design-guidelines                                           | vercel-labs/agent-skills                                                                                        | Diseño / UX   | Revisar UI contra guías de interfaz                                       |
| accessibility                                                   | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills)                               | Frontend      | Auditoría WCAG 2.2                                                        |
| seo                                                             | addyosmani/web-quality-skills                                                                                   | Frontend      | Meta tags, datos estructurados, sitemap                                   |
| vite                                                            | [antfu/skills](https://github.com/antfu/skills)                                                                 | Frontend      | Configuración de Vite                                                     |
| vitest                                                          | antfu/skills                                                                                                    | Tests         | Tests unitarios                                                           |
| mysql                                                           | [planetscale/database-skills](https://github.com/planetscale/database-skills)                                   | BD            | Esquema, índices, consultas, migraciones en MySQL/InnoDB                  |
| brainstorming, writing-plans, executing-plans                   | [obra/superpowers](https://github.com/obra/superpowers)                                                         | Método        | Diseñar y planificar antes de programar                                   |
| test-driven-development                                         | obra/superpowers                                                                                                | Método        | TDD (test primero)                                                        |
| systematic-debugging                                            | obra/superpowers                                                                                                | Método        | Depurar buscando la causa raíz                                            |
| verification-before-completion                                  | obra/superpowers                                                                                                | Método        | No dar nada por hecho sin evidencia                                       |
| requesting-code-review, receiving-code-review                   | obra/superpowers                                                                                                | Método        | Revisión de código                                                        |
| subagent-driven-development, dispatching-parallel-agents        | obra/superpowers                                                                                                | Subagentes    | Repartir trabajo extenso entre subagentes                                 |
| finishing-a-development-branch                                  | obra/superpowers                                                                                                | Git           | Cerrar una rama `feat/*`                                                  |
| performance, core-web-vitals, best-practices, web-quality-audit | addyosmani/web-quality-skills                                                                                   | Frontend      | Rendimiento, Core Web Vitals, buenas prácticas, auditoría tipo Lighthouse |
| tailwind-design-system                                          | [wshobson/agents](https://github.com/wshobson/agents)                                                           | Diseño        | Sistema de diseño y tokens con Tailwind 4                                 |
| loading-states                                                  | [owl-listener/designer-skills](https://github.com/owl-listener/designer-skills)                                 | UX            | Skeletons, spinners, carga progresiva                                     |
| playwright-cli                                                  | [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli)                                         | QA            | Manejar el navegador con Playwright (oficial de Microsoft)                |
| playwright-best-practices                                       | [currents-dev/playwright-best-practices-skill](https://github.com/currents-dev/playwright-best-practices-skill) | QA            | Tests e2e robustos: axe, seguridad, móvil                                 |
| e2e-testing-patterns                                            | wshobson/agents                                                                                                 | QA            | Patrones de tests end-to-end                                              |
| testing-strategy                                                | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)                       | QA            | Planificar qué probar (oficial de Anthropic)                              |
| nodejs-backend-patterns                                         | wshobson/agents                                                                                                 | Backend       | Patrones de Express: middlewares, errores, API                            |
| owasp-security                                                  | [agamm/claude-code-owasp](https://github.com/agamm/claude-code-owasp)                                           | Seguridad     | OWASP Top 10:2025 y ASVS 5.0                                              |

## Skills de proyecto (`.claude/skills/`)

| Skill                               | Fuente                                                                                  | Para qué                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| api-module, db-change, web-feature  | Este repo                                                                               | Recetas propias                                                 |
| better-auth-best-practices          | [better-auth/skills](https://github.com/better-auth/skills)                             | Configurar Better Auth                                          |
| better-auth-security-best-practices | better-auth/skills                                                                      | Endurecer la autenticación                                      |
| email-and-password-best-practices   | better-auth/skills                                                                      | Login con email/contraseña                                      |
| shadcn                              | [shadcn-ui/ui](https://github.com/shadcn-ui/ui)                                         | Componentes shadcn/ui (ADR 0008)                                |
| gdpr-dsgvo-expert                   | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)         | DSGVO: riesgos de privacidad, DPIA, derechos de los interesados |
| gdpr-data-handling                  | wshobson/agents                                                                         | Consentimiento y privacidad desde el diseño                     |
| tanstack-query-best-practices       | [deckardger/tanstack-agent-skills](https://github.com/deckardger/tanstack-agent-skills) | Datos con TanStack Query                                        |
| react-hook-form                     | [pproenca/dot-skills](https://github.com/pproenca/dot-skills)                           | Formularios con react-hook-form + Zod                           |
| react-pdf                           | [trailofbits/skills-curated](https://github.com/trailofbits/skills-curated)             | PDF de la carta con @react-pdf/renderer (ADR 0009)              |

## Subagentes de proyecto (`.claude/agents/`)

| Subagente                 | Para qué                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| code-reviewer             | Revisar una rama contra `AGENTS.md`, arquitectura y seguridad (solo lectura)                              |
| qa-tester                 | Ejecutar `check:all` y `db:check` y comprobar que existen los tests de `docs/testing.md` (solo verifica)  |
| security-privacy-reviewer | Auditar OWASP + DSGVO/Impressum/BFSG antes de fusionar formularios, auth o páginas legales (solo lectura) |

## Plugins (globales, se instalan desde la app de Claude)

| Plugin            | Fuente    | Estado                                     |
| ----------------- | --------- | ------------------------------------------ |
| Figma             | Figma     | Pendiente (plan gratuito: ~6 llamadas/mes) |
| Playwright        | Microsoft | Pendiente                                  |
| Context7          | Upstash   | Pendiente                                  |
| typescript-lsp    | Anthropic | Pendiente                                  |
| Security Guidance | Anthropic | Pendiente                                  |

## Otros programas

| Programa          | Estado                  |
| ----------------- | ----------------------- |
| GitHub CLI (`gh`) | Instalado y autenticado |
| Mailpit           | Solo desarrollo local   |

**Mailpit** (servidor SMTP de pruebas que captura los correos sin enviarlos): SMTP en el puerto **1025**, interfaz web en http://localhost:8025. Se instala a mano desde las releases oficiales de GitHub (`axllent/mailpit`); no es una dependencia del proyecto y nunca se usa en producción.

## Opcionales

| Herramienta                                          | Condición                                      |
| ---------------------------------------------------- | ---------------------------------------------- |
| shadcn MCP (`npx shadcn@latest mcp`)                 | Si se usa shadcn/ui                            |
| MySQL MCP (comunitario, `benborla/mcp-server-mysql`) | Fase 3, solo con usuario MySQL de solo lectura |

## Reinstalar en otra máquina

1. Plugins: desde la app de Claude (o `/plugin` en la terminal).
2. Skills globales:
   ```bash
   npx skills add vercel-labs/skills --skill find-skills -g --agent claude-code
   npx skills add anthropics/skills --skill frontend-design --skill webapp-testing -g --agent claude-code
   npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices --skill web-design-guidelines -g --agent claude-code
   npx skills add antfu/skills --skill vite --skill vitest -g --agent claude-code
   npx skills add addyosmani/web-quality-skills --skill accessibility --skill seo -g --agent claude-code
   npx skills add planetscale/database-skills --skill mysql -g --agent claude-code
   npx skills add addyosmani/web-quality-skills --skill performance --skill core-web-vitals --skill best-practices --skill web-quality-audit -g --agent claude-code
   npx skills add microsoft/playwright-cli --skill playwright-cli -g --agent claude-code
   npx skills add currents-dev/playwright-best-practices-skill --skill playwright-best-practices -g --agent claude-code
   npx skills add wshobson/agents --skill e2e-testing-patterns --skill nodejs-backend-patterns --skill tailwind-design-system -g --agent claude-code
   npx skills add anthropics/knowledge-work-plugins --skill testing-strategy -g --agent claude-code
   npx skills add agamm/claude-code-owasp --skill owasp-security -g --agent claude-code
   npx skills add owl-listener/designer-skills --skill loading-states -g --agent claude-code
   npx skills add obra/superpowers --skill brainstorming --skill writing-plans --skill executing-plans --skill test-driven-development --skill systematic-debugging --skill verification-before-completion --skill requesting-code-review --skill receiving-code-review --skill subagent-driven-development --skill dispatching-parallel-agents --skill finishing-a-development-branch -g --agent claude-code
   ```
3. Skills y subagentes de proyecto: vienen con el repo (`git clone`). Actualizar con `npx skills update`.
4. `winget install --id GitHub.cli -e` y `gh auth login`.

## Sin skill dedicada (a propósito)

- **Panel admin**: no hay ninguna skill de calidad para React + Vite (las que existen son para Medusa o Next.js). Lo cubren `shadcn` (tablas, formularios, diálogos), `web-feature`, `react-hook-form` y `tanstack-query-best-practices`; en la fase 3 se valorará una skill propia `admin-panel`.
- **Legal general**: no hay skills fiables de derecho alemán más allá de la DSGVO. Impressum y BFSG los revisa el subagente `security-privacy-reviewer`; los textos legales finales los valida el restaurante.

## Seguridad

Las skills y plugins se ejecutan con los mismos permisos que el agente. Antes de instalar algo nuevo: verificar autor, repositorio y `SKILL.md`; preferir fuentes oficiales.
