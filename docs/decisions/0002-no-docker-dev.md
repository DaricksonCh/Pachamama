# 0002 — Sin Docker en desarrollo

- **Fecha:** 2026-11-10
- **Estado:** Aceptada

## Contexto

El equipo tiene MySQL instalado como servicio de Windows y no tiene Docker. Aún no se sabe dónde se desplegará.

## Decisión

Desarrollo sin Docker: Node y MySQL locales. Docker se evalúa en la fase de despliegue, cuando se conozca el hosting.

## Alternativas consideradas

- **Docker Compose desde el inicio** — añade instalación (Docker Desktop + WSL) y complejidad sin beneficio claro todavía.

## Consecuencias

- Arranque más simple en Windows.
- Configuración por variables de entorno (`.env`) desde el principio, para que añadir Docker luego no exija cambios de código.
