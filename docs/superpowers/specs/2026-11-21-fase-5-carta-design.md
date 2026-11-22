# Fase 5 — Carta editable y panel de administración

- **Fecha:** 2026-11-21 · **Rama:** `feat/fase-5-carta` · **Plazo:** 24–26.11.2026 (entrega final 01.12)
- **Decisiones:** [ADR 0008 shadcn/ui](../../decisions/0008-shadcn-ui.md) · [ADR 0009 PDF y fotos](../../decisions/0009-menu-pdf-and-images.md)

## 1. Intención

El restaurante no tiene web. La nueva sale con la carta **en la base de datos** para que el personal la mantenga él mismo (platos, precios, alérgenos, fotos) sin depender del desarrollador, y para que la web pública (M2) y el **PDF descargable** salgan siempre de la misma fuente.

**Éxito:** un admin entra en `/admin`, ve un panel con navegación lateral, crea/edita/oculta/archiva categorías y platos con sus fotos, y el PDF de la carta en de/es refleja el cambio al momento. La carta real del restaurante ya está cargada.

**Objetivos**

- Panel `/admin` con **navegación lateral** e **inicio con resumen**.
- CRUD de **categorías** y **platos** con formularios propios, campos obligatorios/opcionales, validación y estados.
- **Borrar = archivar** (cambio de estado, recuperable). Sin borrado físico desde el panel.
- **Fotos** de platos: subir, cambiar, quitar.
- **PDF** de la carta generado desde la BD (de/es), con diseño cuidado.
- **Carga inicial** de la carta del PDF del restaurante (traducida al español) y de las fotos de `material/`.
- Endpoint **público** de lectura de la carta (lo usará M2).

**No objetivos (esta fase)**

- Páginas públicas de la carta (M2). Aquí solo el endpoint y el PDF.
- Gestión de usuarios del personal desde el panel (sigue `npm run admin:create`).
- Historial de cambios / auditoría, variantes de plato con precios distintos, menús del día, bebidas (no están en el PDF).

**Anti-objetivos**

- Que un error del personal deje la carta pública rota o vacía sin querer (por eso archivar en vez de borrar, y confirmaciones).
- Que un plato con datos dudosos salga publicado sin que nadie lo sepa (marca "provisional" visible en el panel y test que bloquea la publicación — fase M4).
- Formularios que solo funcionen en escritorio: el personal usará el móvil.

## 2. Modelo de datos

Migración nueva `2026_11_24_001_menu`. Convenciones de ADR 0007 (snake_case, plural, `DATETIME(3)` UTC, `utf8mb4`).

### `menu_categories`

| Columna                            | Tipo                                | Notas              |
| ---------------------------------- | ----------------------------------- | ------------------ |
| `id`                               | INT UNSIGNED AUTO_INCREMENT PK      |                    |
| `name_de`, `name_es`               | VARCHAR(80) NOT NULL                | Obligatorios       |
| `description_de`, `description_es` | VARCHAR(500) NULL                   | Opcionales         |
| `sort_order`                       | INT NOT NULL DEFAULT 0              | Orden en web y PDF |
| `status`                           | ENUM('visible','hidden','archived') | Default `visible`  |
| `created_at`, `updated_at`         | DATETIME(3)                         |                    |

### `dishes`

| Columna                            | Tipo                                  | Notas                                                |
| ---------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `id`                               | INT UNSIGNED AUTO_INCREMENT PK        |                                                      |
| `category_id`                      | INT UNSIGNED NOT NULL FK → categories | `ON DELETE RESTRICT`; índice                         |
| `name_de`, `name_es`               | VARCHAR(120) NOT NULL                 | Obligatorios                                         |
| `description_de`, `description_es` | VARCHAR(1000) NULL                    | Opcionales                                           |
| `price`                            | DECIMAL(10,2) NOT NULL                | 0,00–999,99 €                                        |
| `diet`                             | ENUM('vegan','vegetarian') NULL       | Opcional; etiqueta en web y PDF                      |
| `allergens`                        | SET('A',…,'N') NOT NULL DEFAULT ''    | 14 alérgenos UE (letras de la carta del restaurante) |
| `image_key`                        | CHAR(36) NULL                         | UUID de la foto en disco                             |
| `image_alt_de`, `image_alt_es`     | VARCHAR(200) NULL                     | Texto alternativo; obligatorio si hay foto           |
| `sort_order`                       | INT NOT NULL DEFAULT 0                | Orden dentro de la categoría                         |
| `status`                           | ENUM('visible','hidden','archived')   | Default `visible`                                    |
| `is_provisional`                   | BOOLEAN NOT NULL DEFAULT FALSE        | Datos por confirmar                                  |
| `provisional_note`                 | VARCHAR(300) NULL                     | Qué falta confirmar (solo panel)                     |
| `created_at`, `updated_at`         | DATETIME(3)                           |                                                      |

Índice `(category_id, status, sort_order)` para la lectura pública.

**Estados:** `visible` (sale en web y PDF) · `hidden` (temporal, p. ej. agotado; no sale) · `archived` ("borrado": fuera de los listados por defecto, recuperable desde el filtro "Archivados"). Una categoría oculta o archivada oculta todos sus platos en web y PDF sin cambiar el estado de cada plato. No se puede archivar una categoría que tenga platos no archivados (409, mensaje claro: "archiva o mueve primero sus platos").

**Alérgenos:** la lista (códigos A–N, nombre de/es) vive en `packages/shared` como constante, no en la BD; es la del Reglamento UE 1169/2011 y no cambia. Tabla de correspondencia de la carta del restaurante: A gluten · B crustáceos · C huevo · D pescado · E cacahuete · F soja · G leche · H frutos de cáscara · I apio · J mostaza · K sésamo · L sulfitos · M altramuces · N moluscos.

## 3. API

Módulo `apps/api/src/modules/menu/` (routes → controller → service → repository). Schemas Zod en `packages/shared/src/menu/`.

### Pública

| Método | Ruta                           | Respuesta                                                                                   |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/menu`                 | Categorías visibles con sus platos visibles, ordenados, ambos idiomas. Sin campos internos. |
| GET    | `/api/v1/menu/pdf?lang=de\|es` | `application/pdf`, `Content-Disposition: inline; filename="pachamama-karte-de.pdf"`         |

Estas dos rutas sobrescriben el `Cache-Control: no-store` general por `no-cache` + `ETag` con la versión de la carta (no tienen datos personales; respuesta 304 si no cambió). El PDF se cachea en memoria por idioma y se invalida en cualquier escritura de la carta.

### Panel (requieren sesión)

| Método | Ruta                                                                          | Rol                                                                   |
| ------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/v1/admin/menu/summary`                                                  | admin, staff                                                          |
| GET    | `/api/v1/admin/menu/categories?status=`                                       | admin, staff                                                          |
| POST   | `/api/v1/admin/menu/categories`                                               | admin                                                                 |
| GET    | `/api/v1/admin/menu/categories/:id`                                           | admin, staff                                                          |
| PATCH  | `/api/v1/admin/menu/categories/:id`                                           | admin                                                                 |
| PUT    | `/api/v1/admin/menu/categories/order`                                         | admin                                                                 |
| GET    | `/api/v1/admin/menu/dishes?categoryId=&status=&q=&provisional=&withoutImage=` | admin, staff                                                          |
| POST   | `/api/v1/admin/menu/dishes`                                                   | admin                                                                 |
| GET    | `/api/v1/admin/menu/dishes/:id`                                               | admin, staff                                                          |
| PATCH  | `/api/v1/admin/menu/dishes/:id`                                               | admin (staff: solo `status` entre `visible`/`hidden`)                 |
| PUT    | `/api/v1/admin/menu/dishes/order`                                             | admin                                                                 |
| PUT    | `/api/v1/admin/menu/dishes/:id/image`                                         | admin (multipart: `image` + `altDe` + `altEs`, los tres obligatorios) |
| DELETE | `/api/v1/admin/menu/dishes/:id/image`                                         | admin                                                                 |

Archivar/restaurar = `PATCH { status }`. No hay `DELETE` de registros.

**Errores:** formato uniforme existente (`AppError`). 400 validación (con detalle por campo para el formulario), 401, 403, 404, 409 (categoría con platos), 413 (imagen > 10 MB), 415 (no es imagen).

**CSRF (pendiente de la revisión de la fase 3):** middleware en `/api/v1` para métodos que modifican: exige `Origin` (o `Sec-Fetch-Site: same-origin`) igual a `WEB_ORIGIN` y `Content-Type: application/json` o `multipart/form-data`. Si no, 403.

**Fotos:** `multer` en memoria (10 MB, 1 archivo) → `sharp` (decodifica = valida, `rotate()`, sin metadatos) → WebP 400/800/1600 px en `UPLOADS_DIR/dishes/<uuid>-<ancho>.webp`. Al reemplazar o quitar, se borran los archivos anteriores después de guardar en BD. **Foto y texto alternativo van juntos:** la foto y su alt de/es se guardan en la misma petición multipart, así nunca hay foto sin alt. `PATCH` del plato solo acepta cambiar `imageAltDe/Es` si el plato ya tiene foto (si no, 400). En un plato nuevo, el formulario crea primero el plato (`POST`) y, si se eligió foto, la sube a continuación; si la subida falla, el plato queda guardado sin foto y el formulario lo dice. Servido en `/uploads` con `Cache-Control: public, max-age=31536000, immutable`. Variable nueva `UPLOADS_DIR` (por defecto `./uploads`, ignorada por git; carpeta aparte en tests).

## 4. PDF de la carta

`apps/api/src/modules/menu/pdf/` con `@react-pdf/renderer`.

- A4 vertical. Portada: logo, "Pachamama Restaurant", "Hausgemacht & traditionell" / "Casero y tradicional", dirección.
- Una sección por categoría con cabecera ilustrada (motivo andino en SVG: franjas tipo tejido, como el mantel de las fotos), platos en lista con nombre, descripción, etiqueta vegano/vegetariano, letras de alérgenos y precio alineado.
- Algunas fotos de platos visibles como acentos (no en todos para no hacerlo pesado).
- Última página: leyenda de alérgenos en el idioma del PDF, aviso LMIV, dirección y horario.
- Colores del logo (verde oscuro y mostaza) sobre fondo crema; tipografías libres (OFL) incrustadas desde `apps/api/assets/fonts/`.
- Objetivo de peso: < 3 MB con fotos (se usan las versiones de 800 px).
- **Caché:** `Cache-Control: no-cache` + `ETag` (versión de la carta). El navegador siempre pregunta y recibe 304 si nada cambió: los cambios se ven al momento sin regenerar el PDF en cada descarga. En el servidor, el PDF se guarda en memoria por idioma y se invalida en cada escritura.
- Dirección y horario del PDF: constantes en `packages/shared` (`restaurant-info.ts`) hasta que la fase 4 los haga editables; los valores provisionales salen de `docs/pendientes.md`.
- El logo se convierte de `material/logo/logo.pdf` a PNG/SVG y se guarda en `apps/api/assets/`.

## 5. Panel `/admin` (web)

shadcn/ui (ADR 0008). Todo traducido de/es (claves i18n). Móvil primero.

**Estructura**

```
┌──────────────┬───────────────────────────────────────────┐
│ PACHAMAMA    │  Inicio                    [de|es] Ana ▾ │
│              ├───────────────────────────────────────────┤
│ ▸ Inicio     │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ ▾ Carta      │  │ 48 platos│ │ 6 provis.│ │ 37 sin   │   │
│   Categorías │  │ visibles │ │ revisar →│ │ foto →   │   │
│   Platos     │  └──────────┘ └──────────┘ └──────────┘   │
│   PDF ↗      │  Accesos: + Nuevo plato · Ver PDF         │
│ (Reservas…   │                                           │
│  próximam.)  │                                           │
│ ─────────    │                                           │
│ Salir        │                                           │
└──────────────┴───────────────────────────────────────────┘
```

En móvil, el lateral es un menú desplegable (`Sheet`). Los módulos futuros no aparecen hasta que existan.

**Rutas**

| Ruta                                 | Vista                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin`                             | Inicio con resumen (tarjetas enlazan a listados filtrados)                                                                                        |
| `/admin/menu/categories`             | Listado: nombre, nº platos, estado, orden (subir/bajar)                                                                                           |
| `/admin/menu/categories/new`, `/:id` | Formulario de categoría                                                                                                                           |
| `/admin/menu/dishes`                 | Listado: foto mini, nombre, categoría, precio, estado, provisional; búsqueda, filtros (categoría, estado, provisional), orden dentro de categoría |
| `/admin/menu/dishes/new`, `/:id`     | Formulario de plato                                                                                                                               |

**Formulario de plato** (react-hook-form + mismo schema Zod que la API)

| Campo                 | Obligatorio | Control                                                                   |
| --------------------- | ----------- | ------------------------------------------------------------------------- |
| Categoría             | Sí          | Select                                                                    |
| Nombre (de / es)      | Sí          | Inputs lado a lado (apilados en móvil)                                    |
| Descripción (de / es) | No          | Textareas con contador                                                    |
| Precio (€)            | Sí          | Input decimal con coma o punto                                            |
| Dieta                 | No          | Ninguna / Vegetariano / Vegano                                            |
| Alérgenos             | No          | 14 casillas con letra y nombre                                            |
| Foto                  | No          | Subir/cambiar/quitar con vista previa; alt de/es obligatorios si hay foto |
| Estado                | Sí          | Visible / Oculto (archivar va aparte)                                     |
| Provisional + nota    | No          | Switch + texto                                                            |

- Los campos obligatorios llevan marca visible y `aria-required`; errores junto al campo y resumen arriba al enviar.
- Aviso al salir con cambios sin guardar.
- Guardar → aviso (toast) y vuelta al listado. Archivar/restaurar desde el listado y la ficha, con diálogo de confirmación.
- Staff: ve todo en solo lectura excepto el interruptor Visible/Oculto.

**Estados de carga:** cada vista con datos prueba cargando (skeleton) / datos / vacío / error, como exige `docs/testing.md`.

## 6. Carga inicial

Script idempotente `npm run db:seed:menu` (`apps/api/scripts/seed-menu.ts`): si no hay categorías, inserta la carta del PDF con traducción al español y las marcas `is_provisional` + nota según [`docs/pendientes.md`](../../pendientes.md). Si existe `material/fotos/`, procesa las fotos que se correspondan con platos (mapa nombre de archivo → plato en el script) por el mismo servicio de imágenes. Los datos de la carta viven en `apps/api/scripts/data/menu-seed.ts`. **Platos con precio dudoso (decidido por el usuario):** se cargan **visibles** con el precio más probable según la maquetación del PDF, con `is_provisional = true` y la duda en `provisional_note`. La web y el PDF los muestran normalmente (la marca "provisional" solo se ve en el panel). **Tiradito** no tiene precio en el PDF: se carga **visible** con 13,00 € (como los demás entrantes de pescado), provisional; se corregirá desde el panel. Los textos en inglés del PDF del restaurante se descartan. El test de publicación de M4 avisa mientras quede alguno provisional.

Se ejecuta en local y en producción una sola vez. Funciona sin la carpeta de fotos (avisa y sigue). Para producción (M4) se copian `material/fotos/` al servidor y se ejecuta allí; el alt de/es de cada foto va en el mapa del script.

Categorías (en orden): Vorspeisen/Entrantes · Suppen & Salate/Sopas y ensaladas · Fingerfood · Hauptgerichte/Platos principales · Vom Grill – Anticuchos/A la parrilla – Anticuchos · Beilagen/Guarniciones (Extras) · Dips/Salsas.

## 7. Pruebas (según `docs/testing.md`)

- **shared:** schemas de categoría y plato (obligatorios, longitudes, precio, alérgenos válidos, alt obligatorio con foto).
- **API (Supertest, BD de tests):** por endpoint caso feliz, 400, 404, 401/403 (staff vs admin), 409 al archivar categoría con platos; público no muestra ocultos/archivados ni campos internos; XSS/SQLi guardados como texto; CSRF sin `Origin` → 403; imagen válida → 3 WebP sin EXIF; archivo no imagen → 415; > 10 MB → 413; PDF → `application/pdf`, empieza por `%PDF`, cambia tras editar.
- **Migración:** up/down/up en `migrations.test.ts` (ya cubre todas).
- **Componentes:** formulario de plato (errores, obligatorios, alt con foto), estados de carga de los listados.
- **e2e (escritorio + móvil):** admin crea categoría y plato con foto, edita precio, oculta, archiva y restaura; staff solo puede ocultar; navegación lateral y menú móvil; axe WCAG 2.2 AA en inicio, listados y formularios; sin errores de consola.
- Cierre: `npm run check:all` + `npm run db:check` en verde, revisión `code-reviewer` y `security-privacy-reviewer`.

## 8. Decidido por el agente (revisable)

- `price` sin IVA desglosado (precio final como en la carta).
- Un solo precio por plato; "Carne o pollo" o "3 sorte" van en la descripción.
- Las versiones en inglés del PDF del restaurante no se guardan (la web es de/es).
- Paleta provisional del PDF y del panel tomada del logo hasta que M1 fije los tokens; ambos leen los mismos tokens.
- Orden manual con botones subir/bajar (accesible) en vez de arrastrar.
- No se guarda quién hizo cada cambio (no hace falta para el MVP; evita datos personales extra).

## 9. Queda para quien implemente

Elección de tipografías concretas para el PDF (libres, OFL), el dibujo de las ilustraciones SVG, el mapa foto → plato tras mirar las 11 fotos, el texto exacto de las traducciones y los mensajes del panel.
