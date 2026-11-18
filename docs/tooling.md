# Herramientas de IA — Pachamama

Qué plugins, skills y servidores MCP usa el proyecto, de dónde vienen y dónde están instalados.

## Global vs. proyecto

| Alcance | Dónde vive | Cuándo usarlo |
|---|---|---|
| **Global (usuario)** | `~/.claude/` (plugins, `~/.claude/skills/`, MCP con `--scope user`) | Herramientas generales útiles en cualquier proyecto: Figma, Playwright, Context7, TypeScript LSP, seguridad, find-skills |
| **Proyecto** | Este repo: `.claude/skills/`, `.mcp.json`, `AGENTS.md` | Lo específico de Pachamama: skills propias, Better Auth, MCP que dependen de esta BD |

Regla: **no instalar lo mismo en los dos sitios** (se duplicarían herramientas). Lo global se documenta aquí para que cualquier persona o máquina nueva sepa qué instalar.

## Instalado

| Herramienta | Tipo | Alcance | Fuente | Para qué |
|---|---|---|---|---|
| find-skills | Skill | Global | [vercel-labs/skills](https://github.com/vercel-labs/skills) | Buscar e instalar skills del ecosistema (skills.sh) |
| api-module, db-change, web-feature | Skills | Proyecto | Este repo | Recetas propias del proyecto |

## Pendiente de instalar (aprobado)

| Herramienta | Tipo | Alcance | Fuente | Para qué | Cuándo |
|---|---|---|---|---|---|
| Figma | Plugin (MCP + skills) | Global | Figma — [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide) | Diseño → código | Fase de diseño (ver límite del plan gratuito) |
| Playwright | Plugin (MCP) | Global | Microsoft — [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Probar la UI en navegador real | Fase 4+ |
| Context7 | Plugin (MCP) | Global | Upstash — [upstash/context7](https://github.com/upstash/context7) | Documentación actualizada por versión | Fase 2 |
| typescript-lsp | Plugin | Global | Anthropic | Inteligencia de TypeScript | Fase 2 |
| Security Guidance | Plugin (hooks) | Global | Anthropic | Revisión de seguridad del código generado | Fase 2 |
| GitHub CLI (`gh`) | Programa | Global | GitHub | Pull Requests desde el agente | Antes de fase 2 |
| Better Auth skills | Skills | Proyecto | [better-auth/skills](https://github.com/better-auth/skills) | Buenas prácticas de Better Auth | Fase 3 |

## Opcionales (según decisiones)

| Herramienta | Condición |
|---|---|
| shadcn MCP (oficial, `npx shadcn@latest mcp`) | Solo si se usa shadcn/ui |
| Superpowers (obra) | Metodología TDD / debugging / planes — ver evaluación en el chat del 2026-11-18 |
| MySQL MCP (comunitario, `benborla/mcp-server-mysql`) | Fase 3, solo con usuario MySQL de solo lectura |

## Reinstalar en otra máquina

1. Instalar los plugins globales desde la app de Claude (o `/plugin` en la terminal).
2. `npx skills add vercel-labs/skills --skill find-skills -g --agent claude-code`
3. `winget install --id GitHub.cli -e` y `gh auth login`.
4. Las skills y MCP de proyecto vienen con el repo (`git clone`).

## Seguridad

Las skills y plugins se ejecutan con los mismos permisos que el agente. Antes de instalar algo nuevo: verificar autor, repositorio y contenido de `SKILL.md`. Preferir fuentes oficiales (Anthropic, el fabricante de la herramienta).
