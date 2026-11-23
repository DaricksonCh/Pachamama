# Roadmap — Pachamama

Fuente de verdad del avance del proyecto. **Se actualiza al cerrar cada fase.**

Regla: cada fase termina con verificación → commit → push → actualizar este archivo, y **no se empieza la siguiente sin el visto bueno del usuario**.

## ⚠ Fecha límite: 01.12.2026

El restaurante **se queda sin página web ese día**. Prioridad absoluta: tener una web pública **publicada y funcionando** antes del 01.12. Todo lo que necesita base de datos y panel admin pasa a después de la entrega (plan aprobado el 2026-11-18).

## Hechas

| #   | Fase                         | Contenido                                                                                         |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| 0   | Auditoría de herramientas    | Node, npm, Git, VS Code y extensiones; proyecto fuera de OneDrive; repo GitHub; `gh`              |
| 1   | Repositorio y contexto de IA | `AGENTS.md`, `CLAUDE.md`, `docs/`, ADRs, `.mcp.json`, skills y subagentes                         |
| 2   | Andamiaje técnico            | Monorepo web + API + shared, `GET /api/v1/health`, i18n de/es, ESLint/Prettier/Vitest, CI         |
| 3   | BD y autenticación           | Kysely + migraciones, Better Auth (admin/staff), login `/admin`, BD de tests aislada, MySQL en CI |

## Entrega antes del 01.12.2026 (plan revisado el 2026-11-21)

**Cambio de plan:** el restaurante ya no tiene web ni dominio, así que la nueva sale **directamente con base de datos y panel admin** para que el personal gestione su carta (platos, precios, alérgenos, fotos y el PDF descargable) sin depender del desarrollador. El diseño avanza **en paralelo** porque no depende de la BD.

| Bloque | Contenido                                                                                                                             | Fechas   | Estado    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| F3     | **BD y login**: Kysely + migraciones, Better Auth + plugin admin, login de `/admin`, primer admin, permisos (ADR 0007)                | 22–23.11 | ✅ Hecha  |
| F5     | **Carta editable**: categorías y platos (de/es, precio, alérgenos, foto, visible, orden), carga inicial desde el PDF, PDF descargable | 24–26.11 | ✅ Hecha  |
| M1     | **Diseño** (en paralelo): paleta y estilo del logo, tokens Tailwind, decidir shadcn, maquetas                                         | 22–26.11 | ✅ Hecha  |
| M2     | **Páginas públicas (de/es)**: Inicio, Carta (desde la BD), Historia (lorem), Contacto + mapa, Impressum, Datenschutz                  | 27–28.11 | ✅ Hecha  |
| M4     | **Publicación**: servidor en la UE (Node + MySQL), dominio nuevo, HTTPS, copias de seguridad, SEO básico                              | 29.11    | Pendiente |
| —      | Margen                                                                                                                                | 30.11    | —         |

**Después del 01.12:** reservas (formulario por email primero, luego en BD), horarios editables, noticias, pedidos, tienda, multimedia, textos legales editables.

**Datos provisionales:** horario, teléfono, email, Impressum, historia (lorem) y alérgenos dudosos de la carta llevan datos genéricos marcados como provisionales. Un test bloquea la publicación mientras queden.

## Fases posteriores

| #   | Fase                  | Contenido                                                                     | Estado                 |
| --- | --------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| 4   | Horarios y cierres    | Horario semanal y cierres editables desde el panel                            | ✅ Hecha con la fase 7 |
| 6   | Noticias y avisos     | Publicaciones y avisos destacados desde el panel                              | Pendiente              |
| 7   | Reservas              | Formulario con email y luego en BD, con gestión y confirmación desde el panel | ✅ Hecha (ADR 0012)    |
| 8   | Pedidos gastronómicos | Pedido para recoger, franjas horarias, estados, emails                        | Pendiente              |
| 9   | Tienda                | Productos, stock, compra para recoger                                         | Pendiente              |
| 10  | Multimedia            | Galería de fotos y vídeos                                                     | Pendiente              |
| 11  | Contenidos editables  | Historia y textos legales editables desde el panel                            | Pendiente              |
| 12  | Producción madura     | Evaluar Docker, monitorización                                                | Pendiente              |

## Información necesaria del restaurante (urgente)

- [x] Dominio: el anterior caducó; se compra uno nuevo al publicar
- [x] Carta (PDF de/en). Faltan alérgenos y precios de algunos platos (provisionales)
- [ ] Horarios, dirección, teléfono, email
- [x] Logo (PDF, sin vectorial ni manual de marca) y 11 fotos (la cocinera autoriza su foto)
- [ ] Texto de la historia (por ahora lorem)
- [ ] Datos del Impressum: razón social, titular, dirección, USt-IdNr.
- [ ] Email que recibe las reservas
- [x] Webs de referencia: muchosmas.eu, aioli-schnoor.de, Instagram del restaurante
- [x] Dirección: Am Gaswerk 1, 28197 Bremen

## Decisiones pendientes

**MVP**

- Hosting en la UE con Node + MySQL (p. ej. un VPS pequeño) y proveedor de email (SMTP con contrato AVV).
- Herramienta de prerender/SEO para la SPA.
- ✅ shadcn/ui: sí (ADR 0008), ya usado en el panel.
- Anti-bot del formulario (honeypot + rate-limit; Turnstile opcional).

**Fase 3**

- ✅ Base de datos: **MySQL 8.4 LTS Community** en local (puerto 3307), base `pachamama` con usuario propio.
- ✅ Capa de datos: **Kysely + mysql2** (ADR 0007).
- ✅ `disableSignUp`: solo un admin crea usuarios.

**Seguridad (anotado en la revisión de la fase 3)**

- Antes de publicar: cron diario de `npm run db:cleanup`, nginx con `X-Forwarded-For $remote_addr`, `API_HOST=127.0.0.1`, información al personal sobre sus datos de acceso.
- Valorar: límite de intentos también por email, lista local de contraseñas comunes, sesión más corta en dispositivos compartidos, colación `utf8mb4_0900_as_ci` en `users.email`, manejo global de 401 en la web.

**Antes de publicar (anotado en la revisión de la fase 5)**

- nginx: CSP y HSTS para la SPA y `/admin`, `/uploads` servido bajo el mismo origen que la web (helmet pone `Cross-Origin-Resource-Policy: same-origin`), `client_max_body_size` ≈ 11 MB, reenviar `Origin` y `Sec-Fetch-*` (CSRF).
- `UPLOADS_DIR` absoluto, fuera del repo, permisos 0750 y dentro de las copias de seguridad. Ejecutar `npm run db:seed:menu` en el servidor con las fotos y reiniciar la API.
- `npm audit --omit=dev` (sharp, multer, @react-pdf) y test de humo del build (`dist/assets` con fuentes y logo).
- Resolver los platos provisionales de [`pendientes.md`](pendientes.md) (alérgenos, precios dudosos, Chaufa "vegano" con salsa de ostión).

**Antes de publicar (anotado en la revisión final de la fase 7, checklist M4)**

- En producción la API y `db:cleanup` no arrancan sin `SMTP_HOST`, `MAIL_FROM` y `RESERVATIONS_NOTIFY_EMAIL` reales, y con TLS (`SMTP_SECURE=true` o `SMTP_REQUIRE_TLS=true`).
- Hacer un `mysqldump` antes de ejecutar las migraciones en producción (MySQL no tiene DDL transaccional).
- Programar el cron diario de `npm run db:cleanup`.
- Fijar el plazo de conservación del buzón de avisos y rellenar `legal.mailboxRetention` (Datenschutz).
- Ejecutar `npm audit --omit=dev`.
- Ejecutar `npm run check:publish`: tiene que estar en verde.

**Más adelante**

- Docker · almacenamiento de imágenes/vídeos · franjas y límites de pedidos · reservas con confirmación manual vs. aforo automático · roles definitivos · plazo de retención de datos.

## Historial

| Fecha      | Hito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | Fase 0: plan de arquitectura y auditoría de herramientas aprobados. Repo GitHub creado.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-11-18 | Proyecto movido fuera de OneDrive a `C:\claude-code`. Fase 1 completada.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-11-18 | Flujo de ramas `main` + `development` + `feat/*`. find-skills instalado; herramientas de IA documentadas en `docs/tooling.md`.                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-11-18 | Skills globales y de proyecto instaladas (frontend, backend, BD, Superpowers); subagentes `code-reviewer` y `qa-tester`. Diseño: se creará con `frontend-design` + referencias (Figma opcional).                                                                                                                                                                                                                                                                                                                          |
| 2026-11-18 | Fase 2 completada: monorepo (web + API + shared), `GET /api/v1/health`, i18n de/es, ESLint/Prettier/Vitest, CI de GitHub Actions.                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-11-18 | MySQL 8.4.13 instalado (puerto 3307, junto a MariaDB de XAMPP). Plan MVP aprobado: web pública publicada antes del 01.12; BD y panel después.                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-11-21 | Skills de QA, seguridad (OWASP), DSGVO, rendimiento y formularios. Pruebas: Playwright e2e (escritorio + móvil), axe WCAG 2.2 AA, skeleton loader, tests de seguridad de la API, `db:check`. Regla: no cerrar nada sin `check:all` en verde.                                                                                                                                                                                                                                                                              |
| 2026-11-21 | Material del restaurante recibido. Plan revisado: BD y carta editable antes del 01.12 (el restaurante no tiene web ni dominio). ADR 0007: Kysely.                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-11-22 | Inicio: «Aus unserer Küche» rediseñada (fondo selva oscuro, 3 clásicos con precio de la carta) y movida tras «Pachamama heißt Mutter Erde» para no repetir el verde del hero. Fotos provisionales en `docs/pendientes.md`.                                                                                                                                                                                                                                                                                                |
| 2026-11-22 | M2 completada (ADR 0011): Carta pública desde la BD (4 estados, alérgenos accesibles, PDF), Historia (lorem marcado), Contacto con mapa local sin terceros, Impressum y Datenschutzerklärung de/es con datos pendientes marcados, títulos por página, `npm run check:publish` (bloquea la publicación con datos provisionales). Revisiones de código y DSGVO aplicadas.                                                                                                                                                   |
| 2026-11-22 | M1 completada (ADR 0010): dirección «Selva + manta», tokens y fuentes locales, cabecera/pie públicos con franja tejida, botón Reservar preparado para la fase 7, rutas localizadas de/es, fotos WebP y nueva Inicio. Plan M1+M2 en `docs/superpowers/plans/`.                                                                                                                                                                                                                                                             |
| 2026-11-22 | Fase 5 completada: carta en BD (categorías y platos de/es, alérgenos, dieta, provisional), panel `/admin` con shadcn (menú lateral, resumen, listados y formularios accesibles), fotos con sharp (WebP sin metadatos), carta pública + PDF de/es generado desde la BD, carga de la carta real (50 platos), CSRF y límite de peticiones. Node 24.22.3.                                                                                                                                                                     |
| 2026-11-22 | Fase 3 completada: Kysely + migraciones, Better Auth con roles admin/staff, login `/admin` (de/es). Revisión de código y de seguridad aplicada (IP fiable para el rate-limit, logs sin datos personales, limpieza de sesiones).                                                                                                                                                                                                                                                                                           |
| 2026-11-23 | Fase 7 completada (ADR 0012): reservas de mesa propias (asistente público de 4 pasos de/es, aforo por franja, confirmación manual con mensaje editable guardado en el historial, correo por SMTP, anonimización a los 90 días), gestión y ajustes en el panel (horario y cierres editables: parte de la fase 4), Datenschutz con el tratamiento de reservas y botón «Reservar» activo (`RESERVATIONS_MODE = 'form'`). e2e en escritorio y móvil con axe. Pendiente: proveedor SMTP + AVV, horario real y email de avisos. |
| 2026-11-23 | Historia rediseñada por bloques (ADR 0013, maqueta D: estructura de muchosmas.eu con variaciones propias): portada con tarjeta y franja, capítulos alternos (a sangre, foto girada, dúo), banda del nombre, manifiesto y galería con flechas y puntos; fuente manuscrita local y animación al hacer scroll con `prefers-reduced-motion`. Regla general «cada bloque con su toque» en `AGENTS.md`. Texto aún lorem.                                                                                                        |
| 2026-11-23 | Contacto rediseñado por bloques (ADR 0014, maqueta A + quipu): postal desde Perú, horario como quipu con estado «abierto ahora» leído del panel (nuevo `GET /api/v1/opening-hours`, con cierres y turnos partidos), mapa pegado con cinta y despedida. Teléfono y email reales confirmados.                                                                                                                                                                                                                               |
| 2026-11-23 | Inicio rediseñada por bloques (ADR 0015, maqueta E = mezcla): nombre «Pacha / mama» como hero, puerta a Historia con fotos pegadas, tres clásicos en rombos sobre la mesa oscura y Visítanos con horario vivo del panel (estado de hoy, semana de un vistazo y resumen agrupado). Historia y Cocina con lorem hasta tener textos.                                                                                                                                                                                         |
