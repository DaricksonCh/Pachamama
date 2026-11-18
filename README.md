# Pachamama

Web del restaurante **Pachamama** — comida peruana.

Sitio público (menú, historia, noticias, multimedia) con reservas, pedidos para recoger y tienda, más un panel de administración para el personal. Idiomas: alemán y español.

## Stack

React + Vite · Node.js + Express · MySQL · Better Auth · TypeScript

## Estado

En desarrollo, por fases. Ver [`docs/roadmap.md`](docs/roadmap.md).

## Empezar

Requisitos: Node.js 24, npm 11 (MySQL 8 a partir de la fase 3).

```bash
npm install
cp .env.example .env   # opcional por ahora: hay valores por defecto
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api/v1/health

Antes de subir cambios: `npm run check` (typecheck, lint, formato y tests).

## Estructura

```
apps/web/          React + Vite (sitio público y /admin)
apps/api/          Express (API REST)
packages/shared/   Schemas Zod y tipos compartidos
docs/              Arquitectura, flujos, seguridad, decisiones, roadmap
```

## Documentación

- [`AGENTS.md`](AGENTS.md) — contexto, reglas y comandos (para personas y agentes de IA)
- [`docs/`](docs/) — arquitectura, flujos de negocio, seguridad, decisiones
