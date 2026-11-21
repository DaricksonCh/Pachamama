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

## Códigos de error

| Código              | HTTP | Cuándo                                           |
| ------------------- | ---- | ------------------------------------------------ |
| `UNAUTHORIZED`      | 401  | Sin sesión o sesión caducada                     |
| `FORBIDDEN`         | 403  | Rol insuficiente o cuenta bloqueada              |
| `NOT_FOUND`         | 404  | Ruta inexistente                                 |
| `INVALID_JSON`      | 400  | Cuerpo JSON mal formado                          |
| `PAYLOAD_TOO_LARGE` | 413  | Cuerpo de más de 100 kB                          |
| `INTERNAL_ERROR`    | 500  | Error no controlado (sin detalles en producción) |
