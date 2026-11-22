# 0011 — Mapa de Contacto sin terceros

- **Fecha:** 2026-11-22
- **Estado:** Aceptada

## Contexto

La página de Contacto necesita mostrar dónde está el restaurante (Am Gaswerk 1, 28197 Bremen). Un mapa embebido de Google Maps u OpenStreetMap carga recursos de terceros y transmite la IP del visitante al abrir la página. Según la DSGVO y la TDDDG, eso exige consentimiento previo, es decir, un banner o un bloqueo en dos clics. La web pública no tiene ningún otro motivo para mostrar un banner.

## Decisión

Usamos una **imagen estática alojada en nuestro servidor** (`apps/web/public/images/map/kontakt-karte.webp`, 512×384, 49 KB):

- Se hizo una única vez a partir de 9 teselas de OpenStreetMap (tile.openstreetmap.org, zoom 16). La descarga la autorizó el usuario el 2026-11-22.
- Las teselas se unieron en local con `sharp` y llevan un marcador con los colores de la marca.
- Debajo de la imagen se muestra la atribución obligatoria: «© OpenStreetMap-Mitwirkende (ODbL)», con enlace a https://www.openstreetmap.org/copyright.
- Hay dos enlaces normales, «Abrir en Google Maps» y «Abrir en OpenStreetMap», que abren en una pestaña nueva. Solo envían datos si el visitante hace clic.

## Alternativas consideradas

- **Iframe de OSM o Google cargado tras dos clics**: el mapa es interactivo, pero añade un componente de consentimiento, más texto legal y más tests.
- **Solo enlaces, sin mapa**: es lo más simple, pero se pierde la referencia visual (la estación de Bremen-Neustadt, justo al lado).
- **Plano ilustrado en SVG**: se integra con el diseño, pero no es exacto.

## Consecuencias

- La página no hace ninguna petición a terceros. El e2e de `public-pages.spec.ts` lo comprueba.
- Si el restaurante se muda, hay que volver a generar la imagen: coordenadas con Nominatim, teselas y unión con `sharp`, como se cuenta en `docs/pendientes.md`.
