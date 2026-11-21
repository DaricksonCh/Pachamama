# Pachamama

Web del restaurante **Pachamama** — comida peruana.

Sitio público (menú, historia, noticias, multimedia) con reservas, pedidos para recoger y tienda, más un panel de administración para el personal. Idiomas: alemán y español.

## Stack

React + Vite · Node.js + Express · MySQL · Better Auth · TypeScript

## Estado

En desarrollo, por fases. Ver [`docs/roadmap.md`](docs/roadmap.md).

## Empezar

Requisitos: Node.js 24, npm 11 y MySQL 8.4 (base `pachamama` + base de tests `pachamama_test`).

```bash
npm install
cp .env.example .env        # rellenar DATABASE_URL y BETTER_AUTH_SECRET
npm run db:migrate          # crea/actualiza las tablas
npm run admin:create -- --email persona@ejemplo.de --name "Nombre"   # primer admin (pide la contraseña)
npm run dev
```

Base de tests (una vez, como root): `apps/api/scripts/sql/create-test-database.sql`.

- Web: http://localhost:5173
- API: http://localhost:3000/api/v1/health
- Panel: http://localhost:5173/admin

Antes de subir cambios: `npm run check:all` (typecheck, lint, formato, tests, build y e2e).

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
