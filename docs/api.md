# API — Pachamama

Base: `/api/v1` (negocio) y `/api/auth` (Better Auth). Respuestas de error siempre con el formato `{ "error": { "code", "message", "details?" } }`.

## Autenticación (`/api/auth`, Better Auth)

Solo para el personal del restaurante. **No hay registro público**: los usuarios los crea un admin (`npm run admin:create` o, más adelante, el panel).

| Método | Ruta                      | Descripción                                                                          |
| ------ | ------------------------- | ------------------------------------------------------------------------------------ |
| POST   | `/api/auth/sign-in/email` | Login `{ email, password }`. Cookie de sesión httpOnly. Máx. 5 intentos/min/IP → 429 |
| POST   | `/api/auth/sign-out`      | Cierra la sesión                                                                     |
| GET    | `/api/auth/get-session`   | Sesión actual (lo usa el cliente de Better Auth)                                     |
| POST   | `/api/auth/admin/*`       | Gestión de usuarios del plugin admin (solo rol `admin`)                              |

Protecciones: comprobación de origen (CSRF) con `WEB_ORIGIN` como origen de confianza, Fetch Metadata contra login por navegación cruzada, mismo error para email desconocido y contraseña incorrecta.

## Negocio (`/api/v1`)

| Método | Ruta                  | Acceso      | Respuesta                                   |
| ------ | --------------------- | ----------- | ------------------------------------------- |
| GET    | `/api/v1/health`      | Público     | `{ status, service, version, timestamp }`   |
| GET    | `/api/v1/me`          | Con sesión  | `{ data: { id, name, email, role } }` · 401 |
| GET    | `/api/v1/admin/users` | Rol `admin` | `{ data: StaffUser[] }` · 401 · 403         |

Los schemas de respuesta viven en `packages/shared` (`healthResponseSchema`, `staffUserSchema`).

## Carta — panel (`/api/v1/admin/menu`)

Requieren sesión. Las escrituras exigen `Origin` de la web y `Content-Type: application/json` (CSRF). Respuestas `{ data }`; los PUT de orden devuelven 204. Archivar/restaurar = `PATCH { status }`; no hay `DELETE`.

| Método | Ruta                                                                   | Acceso                                          | Notas                                                                                    |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/admin/menu/summary`                                                  | admin, staff                                    | `MenuSummary` (visibles, ocultos, provisionales, sin foto, categorías)                   |
| GET    | `/admin/menu/categories?status=`                                       | admin, staff                                    | `AdminCategory[]` con `dishCount`, por `sortOrder`                                       |
| POST   | `/admin/menu/categories`                                               | admin                                           | 201; se añade al final del orden                                                         |
| GET    | `/admin/menu/categories/:id`                                           | admin, staff                                    | 404 `NOT_FOUND`; id no numérico → 400                                                    |
| PATCH  | `/admin/menu/categories/:id`                                           | admin                                           | Archivar con platos no archivados → 409 `CATEGORY_HAS_DISHES`                            |
| PUT    | `/admin/menu/categories/order`                                         | admin                                           | `{ ids: number[] }`; id desconocido → 400 `INVALID_ORDER`                                |
| GET    | `/admin/menu/dishes?categoryId=&status=&q=&provisional=&withoutImage=` | admin, staff                                    | Sin `status` excluye archivados. `q`: nombre de/es, sin distinguir mayúsculas ni acentos |
| POST   | `/admin/menu/dishes`                                                   | admin                                           | 201; el precio acepta `"12,90"`; `categoryId` inexistente → 400 `INVALID_CATEGORY`       |
| GET    | `/admin/menu/dishes/:id`                                               | admin, staff                                    | `AdminDish`; 404                                                                         |
| PATCH  | `/admin/menu/dishes/:id`                                               | admin (staff: solo `status` `visible`/`hidden`) | Otro campo de staff → 403 `FORBIDDEN`; `imageAlt*` sin foto → 400 `NO_IMAGE`             |
| PUT    | `/admin/menu/dishes/order`                                             | admin                                           | `{ ids: number[] }`                                                                      |

## Códigos de error

| Código                | HTTP | Cuándo                                           |
| --------------------- | ---- | ------------------------------------------------ |
| `UNAUTHORIZED`        | 401  | Sin sesión o sesión caducada                     |
| `FORBIDDEN`           | 403  | Rol insuficiente o cuenta bloqueada              |
| `NOT_FOUND`           | 404  | Ruta inexistente                                 |
| `INVALID_JSON`        | 400  | Cuerpo JSON mal formado                          |
| `VALIDATION_ERROR`    | 400  | Entrada inválida; `details` = errores por campo  |
| `INVALID_CATEGORY`    | 400  | El plato apunta a una categoría inexistente      |
| `INVALID_ORDER`       | 400  | La lista de orden incluye ids desconocidos       |
| `NO_IMAGE`            | 400  | Texto alternativo de un plato sin foto           |
| `CATEGORY_HAS_DISHES` | 409  | Archivar una categoría con platos no archivados  |
| `PAYLOAD_TOO_LARGE`   | 413  | Cuerpo de más de 100 kB                          |
| `INTERNAL_ERROR`      | 500  | Error no controlado (sin detalles en producción) |
