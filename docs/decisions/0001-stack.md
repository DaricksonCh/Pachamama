# 0001 — Stack: React + Vite, Node.js + Express, MySQL

- **Fecha:** 2026-11-10
- **Estado:** Aceptada

## Contexto
Web de restaurante con contenido público, tres procesos (reservas, pedidos, tienda) y panel admin. El desarrollador ya domina un stack tradicional.

## Decisión
- Frontend: **React + Vite** (SPA) con TypeScript.
- Backend: **Node.js + Express 5** con TypeScript (ESM).
- Base de datos: **MySQL 8**.
- TypeScript strict en todo el proyecto.

## Alternativas consideradas
- **Next.js** — descartado por preferencia del usuario; se cubre el SEO con prerender de páginas públicas.
- **Drizzle ORM** — descartado por preferencia del usuario. La capa de datos (Kysely o Prisma) se decide en fase 3.

## Consecuencias
- Stack conocido ⇒ más velocidad y autonomía del desarrollador.
- Al ser SPA, el SEO necesita prerender (se decide en despliegue).
- Dos apps separadas (web y API) ⇒ proxy de Vite en desarrollo para compartir origen y cookies.
