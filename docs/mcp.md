# MCP (Model Context Protocol) — Pachamama

MCP permite que un agente de IA use herramientas externas (navegador, base de datos, GitHub…). El proyecto queda **preparado pero sin servidores activos**: se activan cuando una fase los necesite.

## Dónde se configura cada herramienta

| Herramienta | Archivo                                                   | En el repo                                              |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------- |
| Claude Code | `.mcp.json` (raíz del proyecto)                           | Sí (sin secretos)                                       |
| Cursor      | `.cursor/mcp.json`                                        | No (ignorado en `.gitignore`); copiar desde `.mcp.json` |
| Codex CLI   | `~/.codex/config.toml` (sección `[mcp_servers.<nombre>]`) | No (configuración de usuario)                           |

Formato de `.mcp.json` (Cursor usa el mismo):

```json
{
  "mcpServers": {
    "nombre": {
      "command": "npx",
      "args": ["-y", "paquete-del-servidor"],
      "env": { "VARIABLE": "${VARIABLE}" }
    }
  }
}
```

Equivalente en Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.nombre]
command = "npx"
args = ["-y", "paquete-del-servidor"]
```

## Reglas

- **Nunca** poner tokens ni contraseñas en `.mcp.json`: usar variables de entorno (`${VARIABLE}`).
- Servidores de base de datos siempre con un **usuario MySQL de solo lectura**.
- Antes de añadir un servidor, verificar que el paquete es oficial o de confianza.
- Cada servidor nuevo se registra en la tabla de abajo.

## Candidatos

| Servidor             | Para qué                                                      | Cuándo   |
| -------------------- | ------------------------------------------------------------- | -------- |
| Playwright MCP       | Probar la UI, responsive y accesibilidad en un navegador real | Fase 4+  |
| MySQL (solo lectura) | Inspeccionar la BD local                                      | Fase 3+  |
| GitHub MCP           | Issues y PRs desde el agente (innecesario si se instala `gh`) | Opcional |

## Servidores activos

Ninguno.
