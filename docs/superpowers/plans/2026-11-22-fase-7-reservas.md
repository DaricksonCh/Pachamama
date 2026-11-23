# Fase 7 — Reservas de mesa · Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: `subagent-driven-development` (política de AGENTS.md). Pasos con casillas `- [ ]`.

**Objetivo:** que un cliente pida mesa online en 4 pasos (personas → fecha → hora → datos) y que el personal la confirme o rechace en `/admin`, enviando al cliente un correo con un texto predeterminado que puede editar.

**Arquitectura:** reservas propias (sin widgets de terceros). Horario, cierres, ajustes y plantillas en MySQL, editables en `/admin`. El cálculo de franjas es una función pura en `@pachamama/shared` (usada por la API; la web solo pinta lo que devuelve la API). Correo con Nodemailer + SMTP; en local, Mailpit.

**Stack:** Kysely/MySQL 8.4, Express 5, Zod 4, React 19 + react-hook-form + TanStack Query, shadcn (`calendar` = react-day-picker), `date-fns` + `@date-fns/tz`, `nodemailer`.

**Spec:** plan aprobado el 2026-11-22 (`~/.claude/plans/reflective-dazzling-kernighan-…md`): propuesta de diseño **A**, confirmación **manual + aforo**, horarios dentro de la fase, correo al decidir con mensaje editable.

## Restricciones globales

- Zona del restaurante: `RESTAURANT_TIME_ZONE = 'Europe/Berlin'`. BD y API en UTC; la web muestra siempre la hora local del restaurante (aunque el navegador esté en otra zona).
- Franjas cada **30 min**; última franja = cierre − `lastSlotBeforeCloseMinutes` (por defecto **60**).
- Ajustes por defecto: personas online **1–10**, aforo por franja **30 personas**, antelación mínima **120 min**, máxima **60 días**, reservas el mismo día online: **no** (llamar).
- Horario inicial (provisional, igual que `RESTAURANT_INFO`): mar–dom 13:00–22:00, lunes cerrado.
- Estados y transiciones: los de `docs/domain-flows.md` §1. Solo `pending` y `confirmed` ocupan aforo.
- Mensaje del admin: texto plano, **máx. 2000** caracteres; variables `{name}`, `{date}`, `{time}`, `{party}`. En el HTML del correo todo se escapa.
- Sin newsletter, sin captcha de terceros: honeypot + rate-limit (`RATE_LIMIT_RESERVATION_PER_10MIN`, por defecto 5).
- Retención DSGVO: anonimizar reservas `RESERVATIONS_RETENTION_DAYS` (por defecto **90**) días después de `startsAt`.
- Textos visibles en i18n de/es; código y commits en inglés; tests nunca se debilitan; `check:all` + `db:check` en verde al cerrar.

## Puntos de revisión (no cubiertos de forma natural; cada uno tiene su test en la tarea indicada)

1. **Cambio de hora** (29.03.2026 / 25.10.2026): las franjas siguen siendo 13:00, 13:30… locales y se guardan con el offset UTC correcto → Tarea 1.
2. **Dos clientes piden las últimas plazas a la vez**: solo uno entra; el otro recibe `409 SLOT_FULL` → Tarea 5.
3. **Admin edita el mensaje con `<script>` o saltos de línea**: llega escapado y con saltos `<br>` en el HTML, intacto en texto plano → Tarea 4.
4. **Falla el SMTP al confirmar**: el estado cambia igual, el evento registra `emailStatus: 'failed'` y el panel ofrece reenviar → Tarea 6.
5. **Grupo mayor que el máximo online / mismo día**: la web no deja elegirlo y muestra el aviso de llamar o usar contacto; la API responde 400 si se fuerza → Tareas 5 y 8.

---

### Task 1: Dominio compartido (schemas, estados, franjas, plantillas)

**Archivos:**

- Crear: `packages/shared/src/reservations/reservation.schema.ts`, `reservation-status.ts`, `slots.ts`, `message-template.ts`, `index.ts` (+ `*.test.ts` de cada uno)
- Modificar: `packages/shared/src/index.ts` (export), `packages/shared/package.json` (`date-fns`, `@date-fns/tz`)

**Interfaces (produce):**

- `RESTAURANT_TIME_ZONE`, `RESERVATION_STATUSES = ['pending','confirmed','rejected','cancelled','completed','no_show'] as const`, `type ReservationStatus`
- `canTransition(from: ReservationStatus, to: ReservationStatus): boolean`, `DECISION_STATUSES = ['confirmed','rejected','cancelled'] as const` (los que envían correo con mensaje)
- `reservationRequestSchema` → `{ partySize:int, date:'YYYY-MM-DD', time:'HH:mm', name(2–100), email, phone(6–30, dígitos/+/espacios), comment?(≤500), lang: Language, privacyAccepted: literal(true), website: string.max(0) /* honeypot */ }`
- `openingHoursSchema` (array `{ weekday 0–6, opens 'HH:mm', closes 'HH:mm' }`, opens < closes, sin solapes por día), `closureSchema` (`{ from, to, reasonDe?, reasonEs? }`, from ≤ to), `reservationSettingsSchema` (los campos de las restricciones globales, con sus límites)
- `buildDaySlots(input: { date: string; now: Date; hours: OpeningHours; closures: Closure[]; settings: ReservationSettings; bookedByStart: Map<string /*ISO UTC*/, number> ; partySize: number }): Slot[]` donde `Slot = { time: 'HH:mm'; startsAt: string /*ISO UTC*/; available: boolean }`
- `availableDays(input: { month: 'YYYY-MM'; now; hours; closures; settings }): string[]` (días con al menos una franja futura, sin mirar aforo)
- `toUtc(date, time): Date` y `toRestaurantLocal(d: Date): { date, time }`
- `renderTemplate(text: string, vars: { name; date; time; party }): string` (sustituye solo las 4 variables; deja el resto literal)

- [ ] Tests primero (`slots.test.ts`): martes 13:00–22:00 con `lastSlotBeforeClose=60` → 13:00…21:00 (17 franjas); lunes → `[]`; día dentro de un cierre → `[]`; `now` a las 14:10 del mismo día con `sameDayOnline=false` → `[]`; con `sameDayOnline=true` y antelación 120 → primera franja 16:30; franja con 28 reservadas y `partySize=3`, aforo 30 → `available:false`; **29.03.2026** 13:00 → `startsAt` `2026-03-29T11:00:00.000Z` y 25.10.2026 13:00 → `12:00Z`; fecha > 60 días → `[]`.
- [ ] Tests `reservation-status.test.ts`: tabla completa de transiciones válidas/ inválidas.
- [ ] Tests schemas: honeypot relleno → error; `privacyAccepted:false` → error; `time` 13:15 → error (no múltiplo de 30).
- [ ] Tests `renderTemplate`: sustituye variables; `{otra}` queda literal.
- [ ] Ejecutar `npm test -w @pachamama/shared` → FAIL; implementar; → PASS. `npm run typecheck`.
- [ ] Commit `feat(shared): add reservation domain, slot engine and templates`.

### Task 2: Migración y tipos de BD

**Archivos:**

- Crear: `apps/api/src/db/migrations/2026_11_25_001_reservations.ts`
- Modificar: `migrations/index.ts`, `db/types.ts`, `test/db-helpers.ts` (`resetReservationTables()`), `db/migrations.test.ts`

**Tablas** (camelCase en Kysely, snake_case en MySQL; valores de enum congelados en la migración como en `2026_11_24_001_menu.ts`):

- `opening_hours` (id, weekday tinyint 0–6, opens time, closes time) + semilla provisional mar–dom 13:00–22:00.
- `closures` (id, from_date date, to_date date, reason_de, reason_es varchar(200) null).
- `reservation_settings` (id=1 fijo; slot_minutes, last_slot_before_close_minutes, party_min, party_max, capacity_per_slot, min_lead_minutes, max_advance_days, same_day_online bool, hours_confirmed bool default false — se pone a true al guardar el horario desde el panel) + fila con los valores por defecto.
- `reservation_message_templates` (kind enum confirmed/rejected/cancelled/received, lang enum de/es, subject varchar(150), body text, PK(kind, lang)) + semilla de/es (8 filas; textos cordiales con las 4 variables).
- `reservations` (id int, public_id char(36) único, starts_at datetime(3) UTC, party_size tinyint, name, email, phone, comment varchar(500) null, lang, status enum, decided_by varchar(36) null FK users ON DELETE SET NULL, decided_at null, anonymized_at null, created_at, updated_at; índice `(starts_at, status)`).
- `reservation_events` (id, reservation_id FK CASCADE, from_status null, to_status, actor_id null, message text null, email_status enum sent/failed/skipped, created_at).

- [ ] Test en `migrations.test.ts`: `up` crea las 6 tablas y las semillas (6 tramos de horario, 1 fila de ajustes con `hoursConfirmed=false`, 8 plantillas) y `down` las elimina.
- [ ] Implementar; `npm run db:migrate` y `npm run db:migrate:down` + `db:migrate` en local; `npm run db:check`.
- [ ] Commit `feat(api): add reservations schema migration`.

### Task 3: Correo (infraestructura)

**Archivos:**

- Crear: `apps/api/src/lib/mailer.ts`, `apps/api/src/lib/mailer.test.ts`, `apps/api/src/modules/reservations/emails.ts` (+ test)
- Modificar: `config/env.ts` (`SMTP_HOST`, `SMTP_PORT`=1025, `SMTP_USER?`, `SMTP_PASS?`, `SMTP_SECURE`=false, `MAIL_FROM`, `RESERVATIONS_NOTIFY_EMAIL`; en producción `SMTP_HOST` ≠ localhost y `MAIL_FROM` sin `example`), `.env.example`, `apps/api/package.json` (`nodemailer`, `@types/nodemailer`)

**Interfaces:**

- `interface Mailer { send(msg: { to: string; subject: string; text: string; html: string }): Promise<void> }`; `createSmtpMailer(env)`; `createMemoryMailer(): Mailer & { sent: Msg[]; failNext(): void }` (tests).
- `buildDecisionEmail({ kind, lang, subject, body, reservation }): { subject, text, html }` — `html` = cabecera Pachamama + `escapeHtml(body)` con `\n`→`<br>` + bloque con fecha/hora/personas/dirección.
- `buildStaffNotification(reservation)` (solo datos mínimos + enlace a `/admin/reservations/:id`).

- [ ] Tests: `<script>alert(1)</script>` en el cuerpo → aparece como `&lt;script&gt;` en `html` e intacto en `text`; saltos de línea → `<br>`; idioma es → fecha `vie., 27 nov 2026`, de → `Fr., 27. Nov. 2026` (formato con `Intl` en `Europe/Berlin`).
- [ ] Implementar; tests en verde. Documentar Mailpit en `docs/tooling.md` (instalación local, puerto 1025/8025).
- [ ] Commit `feat(api): add mailer and reservation email builders`.

### Task 4: API horario, cierres, ajustes y plantillas (admin)

**Archivos:** crear `apps/api/src/modules/reservations/settings.{repository,service,controller,routes}.ts` + `settings.admin.test.ts`; registrar en `routes.ts` como `/admin/reservation-settings`.

**Endpoints** (todos `requireAuth`; lectura `admin|staff`, escritura `admin`):
`GET/PUT /hours` (reemplaza la semana entera en transacción) · `GET/POST /closures`, `DELETE /closures/:id` · `GET/PATCH /settings` · `GET /templates`, `PUT /templates/:kind/:lang`.

**Interfaces (produce):** `SettingsService.getBookingContext(): Promise<{ hours; closures; settings }>` (lo usa la Tarea 5; caché en memoria invalidada al escribir).

- [ ] Tests (Supertest): anónimo 401; staff lee 200 / escribe 403; admin guarda semana con solape → 400 `VALIDATION_ERROR`; plantilla con body > 4000 → 400; cierre `from > to` → 400; tras PUT `/hours` `getBookingContext` devuelve lo nuevo.
- [ ] Implementar siguiendo `menu.*` (`parse()` de controller, `AppError`). Verde.
- [ ] Commit `feat(api): add admin opening hours, closures, settings and templates`.

### Task 5: API pública de reservas

**Archivos:** crear `modules/reservations/reservations.{repository,service,controller}.ts`, `public-reservations.routes.ts`, `reservations.public.test.ts`; modificar `routes.ts` (`/reservations`), `middlewares/rate-limit.ts` (`reservationLimiter`), `env.ts` (`RATE_LIMIT_RESERVATION_PER_10MIN`).

**Endpoints:**

- `GET /api/v1/reservations/availability?month=YYYY-MM` → `{ data: { days: string[], partyMin, partyMax, sameDayOnline } }`
- `GET /api/v1/reservations/availability?date=YYYY-MM-DD&party=N` → `{ data: { slots: Slot[] } }`
- `POST /api/v1/reservations` (limiter) → `201 { data: { publicId, startsAt, partySize, status:'pending' } }`. Honeypot relleno → **201 falso** sin guardar ni enviar. Franja inexistente/pasada/cerrada → 400 `SLOT_UNAVAILABLE`; sin aforo → 409 `SLOT_FULL`. Inserta dentro de una transacción con `SELECT … FOR UPDATE` sobre `reservation_settings` (serializa la comprobación de aforo; reutilizar `retry-deadlock.ts`). Después del commit: correo `received` al cliente + aviso a `RESERVATIONS_NOTIFY_EMAIL` (fallo de correo → log sin datos personales, la reserva queda).

- [ ] Tests: días de un mes (lunes fuera); franjas con aforo; POST válido → 201 + 2 correos en `memoryMailer`; honeypot → 201 y 0 filas; `party=11` → 400; mismo día → 400; **dos POST simultáneos** por las últimas 3 plazas → uno 201, otro 409; 6º POST desde la misma IP en 10 min → 429; la respuesta no incluye email/teléfono.
- [ ] Implementar; verde. Commit `feat(api): add public reservation availability and requests`.

### Task 6: API admin de reservas (decisión + mensaje)

**Archivos:** crear `reservations.routes.ts` (admin) + `reservations.admin.test.ts`; registrar `/admin/reservations`.

**Endpoints** (`admin|staff`):

- `GET /?date=YYYY-MM-DD&status=` (lista del día, orden por hora) · `GET /pending-count` · `GET /:id` (con eventos)
- `GET /:id/message-preview?status=confirmed|rejected|cancelled` → `{ subject, body, lang }` ya rellenado con `renderTemplate`
- `PATCH /:id/status` body `{ status, message?: string ≤2000, subject?: string ≤150, notify?: boolean = true }`. Service: `canTransition` o 409 `INVALID_TRANSITION`; para `DECISION_STATUSES` usa `message` si viene, si no la plantilla; guarda `decidedBy/decidedAt`, evento con `message` y `emailStatus`. `completed`/`no_show` no envían correo.
- `POST /:id/resend-email` (reenvía el último mensaje de decisión; para fallos de SMTP).

- [ ] Tests: confirmar sin `message` → correo con plantilla de/es según `lang` del cliente; con `message` editado → ese texto exacto; `pending→completed` → 409; SMTP falla (`failNext`) → 200, estado cambiado, evento `failed`, y `resend-email` lo envía; staff puede decidir; anónimo 401; `pending-count` cuenta solo futuras pendientes.
- [ ] Implementar; verde. Commit `feat(api): let staff decide reservations with an editable customer message`.

### Task 7: Retención DSGVO y comprobación de publicación

**Archivos:** modificar `apps/api/scripts/cleanup.ts` (+ test del service de limpieza), `scripts/publish-check.ts`, `env.ts` (`RESERVATIONS_RETENTION_DAYS`).

- [ ] Test: reserva con `startsAt` hace 91 días → `name='—'`, `email`/`phone`/`comment` vacíos, `anonymizedAt` puesto, mensajes de eventos borrados; una de hace 89 días intacta.
- [ ] `publish-check` falla si el horario en BD sigue siendo el provisional sembrado (marca en `reservation_settings.hours_confirmed=false`) o `RESERVATIONS_NOTIFY_EMAIL` es de ejemplo.
- [ ] Commit `feat(api): anonymize past reservations and guard publishing`.

### Task 8: Web pública — asistente de reserva (propuesta A)

**Archivos:**

- Crear: `apps/web/src/features/reservations/{api.ts, use-availability.ts, reservation-wizard.tsx, steps/party-step.tsx, steps/date-step.tsx, steps/time-step.tsx, steps/details-step.tsx, booking-summary.tsx, success-view.tsx, wizard-state.ts}` + tests; `apps/web/src/pages/reservations-page.tsx` (+ test); componentes shadcn `calendar`, `toggle-group`.
- Modificar: `pages/public-page-route.tsx` (página `reservations`), `locales/{de,es}/common.json` (`reservations.*`), `packages/shared/src/site/public-routes.ts` (`RESERVATIONS_MODE='form'` **solo en la Tarea 11**).

**Comportamiento:** barra de 4 pasos; resumen lateral sticky (escritorio) / barra inferior fija (móvil) con "Siguiente"; Personas = botones 1…`partyMax` + "Más" (texto: grupos grandes → contacto/teléfono); Fecha = `Calendar` con `disabled` para días fuera de `days`, semana empieza en lunes, locale de/es; Hora = franjas agrupadas Mediodía/Noche, no disponibles tachadas y `aria-disabled`; Datos = react-hook-form + `zodResolver(reservationRequestSchema)`, honeypot oculto (`aria-hidden`, `tabIndex=-1`), casilla privacidad con enlace a Datenschutz; Éxito = resumen + "revisa spam". `wizard-state.ts` = `useReducer` (volver atrás conserva datos; cambiar personas o fecha limpia la hora). Foco al encabezado de cada paso; `aria-live="polite"` en la carga de franjas; skeleton mientras carga; 409 → vuelve al paso Hora con aviso y refresca franjas.

- [ ] Tests (Vitest + Testing Library, API mockeada): recorrido completo envía el payload correcto; día deshabilitado no seleccionable; cambiar fecha borra hora; 409 vuelve a Hora con mensaje; errores de campo con resumen accesible (reutilizar `form-error-summary.tsx`); textos de y es.
- [ ] Revisar con skills `frontend-design`/`accessibility` y captura en navegador (escritorio y móvil).
- [ ] Commit `feat(web): add public reservation wizard`.

### Task 9: Admin — lista, detalle y "Mensaje al cliente"

**Archivos:** crear `apps/web/src/features/reservations/admin/{api.ts, reservations-list.tsx, reservation-detail.tsx, decision-dialog.tsx, status-badge.tsx}` + tests; `pages/admin/reservations/{reservations-page,reservation-detail-page}.tsx`; modificar `router.tsx`, `admin-sidebar.tsx` (grupo "Reservas" con contador de `pending-count`), locales `admin.reservations.*`.

**Comportamiento:** lista por día (selector de fecha, hoy por defecto) con filtro de estado y tabla shadcn; detalle con datos, historial de eventos y botones según `canTransition`. Confirmar/Rechazar/Cancelar abren `DecisionDialog`: carga `message-preview`, `Textarea` editable (contador /2000), "Restaurar texto predeterminado", vista previa, idioma del cliente, casilla "Enviar correo" (marcada), botón "Enviar y confirmar"/"Enviar y rechazar". No-show/Completada con `AlertDialog` simple. Evento con `emailStatus='failed'` → aviso + botón "Reenviar correo".

- [ ] Tests: el diálogo muestra el texto predeterminado; editar + enviar manda `message` editado; restaurar vuelve al original; botones no permitidos no aparecen; aviso de fallo y reenvío.
- [ ] Commit `feat(web): add admin reservation management with editable customer message`.

### Task 10: Admin — ajustes de reservas

**Archivos:** crear `features/reservations/admin/{hours-form.tsx, closures-list.tsx, settings-form.tsx, templates-form.tsx}` + tests; `pages/admin/reservations/settings-page.tsx` (pestañas: Horario · Cierres · Reservas · Textos de correo); ruta y entrada de menú solo para `admin`.

- [ ] Tests: semana con solape muestra error; plantillas de/es con lista de variables y vista previa con datos de ejemplo; staff no ve el enlace.
- [ ] Commit `feat(web): add admin reservation settings, hours and email templates`.

### Task 11: Cierre — e2e, legal, docs y activación

- [ ] E2e `apps/web/e2e/reservations.spec.ts` (escritorio + móvil): reservar en de y en es; axe WCAG 2.2 AA en cada paso; solo teclado; admin confirma con mensaje editado y la reserva aparece confirmada. Correos con el `memoryMailer` de la API en modo test.
- [ ] Datenschutz de/es: tratamiento "Reservas" (art. 6.1.b DSGVO, datos, plazo 90 días, proveedor SMTP pendiente).
- [ ] `RESERVATIONS_MODE = 'form'`; actualizar tests de `reserve-button`.
- [ ] ADR `docs/decisions/0012-reservations.md`; `docs/api.md`, `docs/domain-flows.md` (aforo decidido), `docs/security-privacy.md`, `docs/tooling.md`, `docs/roadmap.md` (fase 7 hecha + parte de la 4), `docs/pendientes.md` (horario real, email de reservas, proveedor SMTP).
- [ ] `npm run check:all` y `npm run db:check` en verde → `code-reviewer` + `security-privacy-reviewer` (Sonnet) → corregir → `qa-tester` → PR a `development`.
