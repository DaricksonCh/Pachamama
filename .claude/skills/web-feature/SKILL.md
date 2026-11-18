---
name: web-feature
description: Crear o ampliar una pantalla o funcionalidad del frontend de Pachamama (React + Vite), pública o del panel /admin, con i18n de/es, formularios con react-hook-form + Zod y datos con TanStack Query.
---

# Funcionalidad web

Aplica las convenciones de `AGENTS.md`. Requiere `apps/web` (fase 2+).

## Pasos

1. **Ruta** en React Router: pública con prefijo de idioma (`/:lang/...`) o en `/admin/...` (protegida por sesión y rol).
2. **Datos**: hooks de TanStack Query por recurso (`useXxxQuery`, `useXxxMutation`); invalidar consultas tras mutaciones.
3. **Formularios**: react-hook-form + `zodResolver` con el schema de `@pachamama/shared` (el mismo que valida la API). Mostrar errores traducidos.
4. **UI**: componentes shadcn/ui + Tailwind; mobile-first; accesible (labels, foco visible, contraste, navegación por teclado).
5. **Textos**: nunca texto fijo; añadir claves en `de` y `es`.
6. **Estados**: cargando, vacío, error y éxito siempre contemplados.
7. **Formularios públicos**: casilla de consentimiento de privacidad y honeypot (ver `docs/security-privacy.md`).
8. **Tests**: Vitest para lógica; Playwright para flujos clave (reserva, pedido, compra, login admin).
9. Verificar: `npm run typecheck`, `npm run lint`, `npm test`, y revisar en el navegador en móvil y escritorio.
