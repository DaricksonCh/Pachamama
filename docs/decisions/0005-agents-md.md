# 0005 — Contexto de IA agnóstico de la herramienta (AGENTS.md)

- **Fecha:** 2026-11-18
- **Estado:** Aceptada

## Contexto
Hoy se trabaja con Claude Code, pero no se descarta usar Codex, Cursor u otros agentes. El contexto del proyecto no debe depender de una herramienta ni de una conversación concreta.

## Decisión
- `AGENTS.md` (estándar abierto, leído por Codex, Cursor y otros) es la **única fuente** de contexto y reglas.
- `CLAUDE.md` solo importa `@AGENTS.md`.
- El detalle vive en `docs/` (Markdown normal); el avance en `docs/roadmap.md`.
- MCP: `.mcp.json` en el repo (Claude Code); `docs/mcp.md` explica el equivalente en Cursor y Codex.

## Alternativas consideradas
- **Un archivo por herramienta** (`CLAUDE.md`, `.cursor/rules`, …) — duplicación y riesgo de que diverjan.

## Consecuencias
- Cambiar de herramienta no exige reescribir contexto.
- Cualquier sesión nueva retoma el proyecto leyendo el repo, sin depender del historial de chat.
