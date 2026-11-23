# 0013 — Página Historia por bloques, fuente manuscrita y animación al hacer scroll

- **Fecha:** 2026-11-23
- **Estado:** Aceptada (amplía ADR 0010)

## Contexto

El diseño provisional de Historia no convencía (`docs/pendientes.md`). El usuario toma como referencia muchosmas.eu/la-historia: cada bloque de la página tiene un toque propio en vez de repetir la misma plantilla. Se compararon cuatro maquetas y se eligió la **D** (estructura de Muchos Más + detalles de la manta, con variaciones para no copiarla).

## Decisión

- **Regla general** (en `AGENTS.md`, Diseño): páginas públicas por bloques, cada uno con su toque; no repetir la misma plantilla seguida.
- **Fuente manuscrita** Caveat (`@fontsource/caveat`, alojada en local, sin Google: DSGVO). Token `--font-script`. Solo frases cortas de apoyo; nunca sustituye a un encabezado real.
- **Animación al hacer scroll**: hook `useReveal` (IntersectionObserver, sin dependencias) + utilidad CSS `reveal`. Sustituye la regla del ADR 0010 de «una sola entrada animada». Con `prefers-reduced-motion: reduce` todo se muestra sin animar.
- **`WovenStripe`**: además de cabecera y pie, puede separar bloques en Historia.
- **Bloques de Historia** (`components/public/story/`): `StoryHero` (foto a sangre + tarjeta desplazada con franja), `StorySplit` (variantes `bleed`, `tilted`, `duo`), `StoryName` (banda chicha con el significado del nombre), `StoryManifesto` (frases cortas + reservar) y `StoryGallery` (carrusel con flechas, puntos y scroll-snap; no avanza solo).

## Alternativas consideradas

- **A · calco de Muchos Más** — fiel, pero sin identidad propia.
- **B · editorial selva** — sobria, se aleja de la referencia.
- **C · manta viva** — muy colorida; se tomaron solo algunos detalles.
- **Cinta de fotos automática** — descartada: movimiento no controlado por el usuario (WCAG 2.2.2).

## Consecuencias

- Nueva dependencia: `@fontsource/caveat`.
- Las demás páginas públicas se irán revisando con la misma regla (pendiente en `docs/pendientes.md`).
