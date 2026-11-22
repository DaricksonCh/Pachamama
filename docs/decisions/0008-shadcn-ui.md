# 0008 — Componentes de interfaz: shadcn/ui

- **Fecha:** 2026-11-21
- **Estado:** Aceptada

## Contexto

La fase 5 convierte `/admin` en un panel de verdad: navegación lateral, inicio con resumen, listados con búsqueda y filtros, formularios de alta/edición, confirmaciones y avisos. Todo debe cumplir WCAG 2.2 AA (BFSG), funcionar en móvil y estar listo antes del 01.12.2026. La decisión "shadcn/ui sí o no" estaba pendiente en el roadmap.

## Decisión

Usar **shadcn/ui** (Tailwind v4 + primitivas Radix) en `apps/web`:

- Los componentes se copian al repo (`src/components/ui/`) y son código nuestro: se adaptan a los tokens de marca de `index.css` sin depender de un tema externo.
- Se usan primero en el panel (`Sidebar`, `Table`, `Form` con react-hook-form + Zod, `Dialog`/`AlertDialog`, `Sheet`, `Select`, `Switch`, `Badge`, `Sonner`…). La web pública puede reutilizarlos cuando el diseño (M1) lo pida.
- Los iconos, con `lucide-react` (el que usa shadcn).

## Alternativas consideradas

- **Componentes propios con Tailwind** — control total, pero rehacer accesibilidad de menús, diálogos y selects lleva días que no tenemos.
- **Librerías completas (MUI, Mantine, Ant)** — estilo propio difícil de adaptar a la marca, más peso y otra forma de estilar distinta de Tailwind.
- **React Admin / Refine** — dan el CRUD hecho, pero imponen su propia capa de datos y rutas, que chocan con TanStack Query, React Router y nuestra API.

## Consecuencias

- Panel accesible y coherente en poco tiempo; el código de los componentes queda en el repo y se puede cambiar.
- Nuevas dependencias en `apps/web` (Radix, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`).
- Los componentes copiados hay que mantenerlos nosotros (actualizar con `npx shadcn add` si hace falta).
