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

| Skill                                                    | Fuente                                                                            | Área          | Para qué                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------- |
| find-skills                                              | [vercel-labs/skills](https://github.com/vercel-labs/skills)                       | Meta          | Buscar e instalar skills (skills.sh)                     |
| frontend-design                                          | [anthropics/skills](https://github.com/anthropics/skills)                         | Diseño        | Dirección visual cuidada, no genérica                    |
| webapp-testing                                           | anthropics/skills                                                                 | Frontend / QA | Probar la web local con Playwright                       |
| vercel-react-best-practices                              | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)           | Frontend      | Rendimiento en React (ignorar reglas de Next.js)         |
| web-design-guidelines                                    | vercel-labs/agent-skills                                                          | Diseño / UX   | Revisar UI contra guías de interfaz                      |
| accessibility                                            | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) | Frontend      | Auditoría WCAG 2.2                                       |
| seo                                                      | addyosmani/web-quality-skills                                                     | Frontend      | Meta tags, datos estructurados, sitemap                  |
| vite                                                     | [antfu/skills](https://github.com/antfu/skills)                                   | Frontend      | Configuración de Vite                                    |
| vitest                                                   | antfu/skills                                                                      | Tests         | Tests unitarios                                          |
| mysql                                                    | [planetscale/database-skills](https://github.com/planetscale/database-skills)     | BD            | Esquema, índices, consultas, migraciones en MySQL/InnoDB |
| brainstorming, writing-plans, executing-plans            | [obra/superpowers](https://github.com/obra/superpowers)                           | Método        | Diseñar y planificar antes de programar                  |
| test-driven-development                                  | obra/superpowers                                                                  | Método        | TDD (test primero)                                       |
| systematic-debugging                                     | obra/superpowers                                                                  | Método        | Depurar buscando la causa raíz                           |
| verification-before-completion                           | obra/superpowers                                                                  | Método        | No dar nada por hecho sin evidencia                      |
| requesting-code-review, receiving-code-review            | obra/superpowers                                                                  | Método        | Revisión de código                                       |
| subagent-driven-development, dispatching-parallel-agents | obra/superpowers                                                                  | Subagentes    | Repartir trabajo extenso entre subagentes                |
| finishing-a-development-branch                           | obra/superpowers                                                                  | Git           | Cerrar una rama `feat/*`                                 |

## Skills de proyecto (`.claude/skills/`)

| Skill                               | Fuente                                                      | Para qué                                      |
| ----------------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| api-module, db-change, web-feature  | Este repo                                                   | Recetas propias                               |
| better-auth-best-practices          | [better-auth/skills](https://github.com/better-auth/skills) | Configurar Better Auth                        |
| better-auth-security-best-practices | better-auth/skills                                          | Endurecer la autenticación                    |
| email-and-password-best-practices   | better-auth/skills                                          | Login con email/contraseña                    |
| shadcn                              | [shadcn-ui/ui](https://github.com/shadcn-ui/ui)             | Componentes shadcn/ui (si se confirma su uso) |

## Subagentes de proyecto (`.claude/agents/`)

| Subagente     | Para qué                                                                      |
| ------------- | ----------------------------------------------------------------------------- |
| code-reviewer | Revisar una rama contra `AGENTS.md`, arquitectura y seguridad (solo lectura)  |
| qa-tester     | Ejecutar typecheck, lint, tests, build y pruebas en navegador (solo verifica) |

## Plugins (globales, se instalan desde la app de Claude)

| Plugin            | Fuente    | Estado                                     |
| ----------------- | --------- | ------------------------------------------ |
| Figma             | Figma     | Pendiente (plan gratuito: ~6 llamadas/mes) |
| Playwright        | Microsoft | Pendiente                                  |
| Context7          | Upstash   | Pendiente                                  |
| typescript-lsp    | Anthropic | Pendiente                                  |
| Security Guidance | Anthropic | Pendiente                                  |

## Otros programas

| Programa          | Estado                           |
| ----------------- | -------------------------------- |
| GitHub CLI (`gh`) | Instalado; falta `gh auth login` |

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
   npx skills add obra/superpowers --skill brainstorming --skill writing-plans --skill executing-plans --skill test-driven-development --skill systematic-debugging --skill verification-before-completion --skill requesting-code-review --skill receiving-code-review --skill subagent-driven-development --skill dispatching-parallel-agents --skill finishing-a-development-branch -g --agent claude-code
   ```
3. Skills y subagentes de proyecto: vienen con el repo (`git clone`). Actualizar con `npx skills update`.
4. `winget install --id GitHub.cli -e` y `gh auth login`.

## Seguridad

Las skills y plugins se ejecutan con los mismos permisos que el agente. Antes de instalar algo nuevo: verificar autor, repositorio y `SKILL.md`; preferir fuentes oficiales.
