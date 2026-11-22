# 0009 — PDF de la carta y fotos de los platos

- **Fecha:** 2026-11-21
- **Estado:** Aceptada

## Contexto

La carta se gestiona desde el panel (fase 5). Hace falta:

1. Un **PDF descargable** para los clientes que nunca se quede desactualizado respecto a la web.
2. **Fotos de los platos** subidas por el personal desde el panel.

El servidor será un VPS pequeño en la UE (Node + MySQL). El PDF actual del restaurante pesa 131 MB y no sirve para la web.

## Decisión

**PDF:** se genera en la API con **`@react-pdf/renderer`** a partir de la BD (solo categorías y platos visibles), en alemán y en español. Diseño propio con los colores del logo, tipografías incrustadas (archivos de fuente en el repo, sin pedirlas a Google al generar) e ilustraciones SVG. Se genera bajo demanda y se guarda en memoria hasta el siguiente cambio de la carta. Skill de apoyo: `react-pdf` (Trail of Bits).

**Fotos:** se guardan en el **disco del servidor** (`UPLOADS_DIR`), fuera del código:

- Subida con `multer` (en memoria, máx. 10 MB, un archivo).
- Se procesan con **`sharp`**: se valida que de verdad es una imagen, se corrige la orientación, se **eliminan los metadatos** (EXIF/GPS: DSGVO) y se guardan en **WebP** en varios anchos (400, 800, 1600 px). El original no se guarda.
- Nombre de archivo aleatorio (UUID); nunca el nombre que manda el navegador.
- Se sirven como estáticos en `/uploads` (Express en desarrollo, nginx en producción) con caché larga: cada foto nueva tiene un nombre nuevo.
- Las copias de seguridad del servidor incluyen `UPLOADS_DIR`.

## Alternativas consideradas

- **PDF subido por el personal** — mantiene su diseño, pero se desincroniza de la web y el archivo actual es enorme.
- **HTML → PDF con un navegador sin cabeza (Playwright/Puppeteer)** — máxima libertad de diseño, pero necesita Chromium en el servidor (cientos de MB de RAM en un VPS pequeño).
- **pdfkit a mano** — ligero, pero la maquetación (columnas, saltos de página) es mucho más laboriosa.
- **Fotos en S3/Cloudinary** — escalan mejor, pero añaden coste, otra cuenta y otro contrato de encargo de tratamiento (AVV). Con decenas de fotos no compensa.

## Consecuencias

- Nuevas dependencias en la API: `@react-pdf/renderer`, `react`, `sharp`, `multer`.
- `sharp` usa binarios nativos: hay que instalarlo en el servidor con la misma plataforma (Linux x64) que producción.
- El disco del servidor pasa a guardar datos: se añade a las copias de seguridad (fase de publicación).
- Si algún día se necesita CDN o varios servidores, se cambia el almacenamiento detrás de una interfaz `ImageStorage` sin tocar el resto.
