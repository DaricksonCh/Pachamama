# Estrategia de pruebas — Pachamama

> **Regla obligatoria:** ninguna tarea, fase o fusión se da por terminada hasta que **todas las pruebas pasen** (`npm run check:all` en verde, y `npm run db:check` si la tarea toca la BD). Si una prueba falla, se arregla la causa; nunca se borra, se salta ni se debilita un test para que pase.

## Comandos

| Comando             | Qué ejecuta                                                       | Dónde corre |
| ------------------- | ----------------------------------------------------------------- | ----------- |
| `npm test`          | Tests unitarios y de integración (Vitest + Supertest)             | Local + CI  |
| `npm run test:e2e`  | Flujos de usuario en navegador real, escritorio y móvil           | Local + CI  |
| `npm run db:check`  | Que la BD existe, es MySQL 8.4, utf8mb4 y tiene mínimo privilegio | Solo local  |
| `npm run check`     | typecheck + lint + formato + tests unitarios                      | Local + CI  |
| `npm run check:all` | `check` + build + e2e: **lo que hay que pasar antes de cerrar**   | Local + CI  |

`test:e2e` arranca API y web solo si no están ya en marcha. La primera vez hay que instalar el navegador: `npx -w @pachamama/web playwright install chromium`.

## Pirámide

| Nivel           | Herramienta                               | Dónde vive                              | Qué cubre                                                                |
| --------------- | ----------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Unitario        | Vitest                                    | `packages/shared/**/*.test.ts`          | Schemas Zod, utilidades puras                                            |
| Integración API | Vitest + Supertest                        | `apps/api/src/**/*.test.ts`             | Endpoints, validación, permisos, errores, cabeceras de seguridad         |
| Componentes     | Vitest + Testing Library (jsdom)          | `apps/web/src/**/*.test.tsx`            | Estados de carga/error/vacío, formularios, i18n                          |
| End-to-end      | Playwright + axe-core                     | `apps/web/e2e/*.spec.ts`                | Flujos de usuario completos, accesibilidad, responsive                   |
| Base de datos   | `db:check` (ahora) · migraciones (fase 3) | `apps/api/scripts/`, `apps/api/src/db/` | Creación, charset, privilegios; luego migraciones up/down y repositorios |

## Qué pruebas exige cada tipo de cambio

### Flujos de usuario (e2e)

Cada flujo de negocio tiene un test e2e del **camino feliz** y de los **errores principales**, en escritorio y móvil:

- Navegación e idioma (de/es, redirecciones) ✅ ya existe.
- Reserva (M3): rellenar, validar, enviar, confirmación; fecha pasada, fuera de horario, campos vacíos.
- Fase 3+: login admin ✅, panel de la carta ✅ (`admin-shell`, `admin-categories`, `admin-dishes`: navegación, crear/editar/ordenar/archivar/restaurar, foto, permisos del staff, axe), pedido para recoger, compra en tienda.
- Sin errores en la consola del navegador durante el flujo.

### Estados de carga (skeleton loaders)

Toda vista que cargue datos prueba sus **cuatro estados**: cargando, con datos, vacío y error.

- Cargando: se ve el `Skeleton` (`components/ui/skeleton.tsx`), `aria-busy="true"` y texto accesible "cargando".
- Se respeta `prefers-reduced-motion` (sin animación).
- Error: mensaje comprensible y traducido, nunca un error técnico.
- Datos inválidos de la API: se rechazan (Zod) y se muestra el estado de error.
- En e2e, la latencia se simula con `page.route()` (ver `e2e/loading-states.spec.ts`).

### Seguridad de formularios

Todo formulario público (reservas, pedidos, contacto, login) debe tener tests de:

| Riesgo                 | Prueba                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Validación             | Mismo schema Zod en web y API; la API rechaza lo inválido aunque la web lo deje pasar (400) |
| XSS                    | Enviar `<script>` / `<img onerror>`: se guarda y se muestra como texto, nunca se ejecuta    |
| Inyección SQL          | Enviar `' OR 1=1 --`: sin efecto (consultas parametrizadas de Kysely)                       |
| Spam / bots            | Honeypot relleno → rechazado; rate-limit → 429 tras N envíos                                |
| Cuerpos enormes        | > 100 kB → 413 ✅ ya existe                                                                 |
| JSON roto              | → 400 con formato estándar, sin filtrar detalles ✅ ya existe                               |
| Prototype pollution    | `__proto__` en el cuerpo sin efecto ✅ ya existe                                            |
| Consentimiento (DSGVO) | Sin casilla de privacidad marcada → no se envía                                             |
| CSRF / sesión          | Sin sesión → 401; rol insuficiente → 403; origen ajeno con cookie → 403 ✅ ya existe        |
| Datos en logs          | Emails y teléfonos no aparecen en los logs                                                  |

### Backend (API)

Por endpoint: caso feliz, validación (400), no encontrado (404), permisos (401/403) y formato de error uniforme. Cabeceras de seguridad (helmet) y CORS ✅ ya existen en `security.test.ts`.

### Base de datos

- `npm run db:check` (conexión, versión 8.4, `utf8mb4`, usuario propio sin privilegios globales ni `GRANT OPTION`, aislado de otras bases, puede crear y borrar tablas).
- **BD de tests aislada `pachamama_test`**: los tests de la API la vacían y la migran al empezar (`src/test/global-setup.ts`). Si el nombre de la base no termina en `_test`, los tests **abortan** para no tocar datos reales.
- `src/db/migrations.test.ts`: todas las migraciones se aplican, se deshacen (down) y se vuelven a aplicar; convención snake_case, `utf8mb4`, `DATETIME(3)` y claves foráneas en cascada.
- Los **e2e levantan su propia API (3100) y web (5174)** contra `pachamama_test` (nunca reutilizan `npm run dev`) y cargan usuarios de prueba con `e2e:seed`.
- En la CI, un contenedor MySQL 8.4 desechable (`TEST_DATABASE_URL`).
- `e2e:seed` vacía también la carta: cada ejecución de e2e empieza limpia.
- Carta (fase 5): reglas y permisos (`menu.rules.test.ts`, `menu.admin.test.ts`), fotos con sharp (`images.test.ts`: formatos, límites, EXIF, path traversal), carta pública y PDF (`public-menu*.test.ts`: ETag, idiomas, glifos), seed (`menu-seed.test.ts`).
- En Windows con Node 24.15 había un cierre aleatorio de los workers por conexiones TCP (nodejs/node#62991): `src/test/supertest-keep-alive.ts` reutiliza conexiones. Usar Node ≥ 24.16.

### Frontend

- Textos visibles con i18n en `de` y `es` (nunca texto fijo).
- Accesibilidad **WCAG 2.2 AA** con axe en cada página nueva (la ley alemana BFSG lo exige) ✅ ya existe para inicio.
- Navegable solo con teclado y con foco visible.
- Responsive: los e2e corren en escritorio y móvil.

### Legal (DSGVO / Impressum)

- Impressum y Datenschutz accesibles desde todas las páginas (test e2e en M2).
- Sin cookies ni recursos de terceros (fuentes, mapas, analítica) antes del consentimiento: el test e2e comprueba que no hay peticiones a dominios externos al cargar.

## Skills de apoyo

`testing-strategy`, `test-driven-development`, `playwright-best-practices`, `e2e-testing-patterns`, `vitest`, `webapp-testing`, `accessibility`, `owasp-security`, `loading-states`, `gdpr-dsgvo-expert`. Detalle en [`tooling.md`](tooling.md).
