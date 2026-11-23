# 0012 — Reservas de mesa propias

- **Fecha:** 2026-11-23
- **Estado:** Aceptada

## Contexto

El restaurante necesita que los clientes reserven mesa desde la web (fase 7). Hay que decidir si se usa un servicio externo o un sistema propio, cómo se evita el exceso de reservas, cómo se guardan las fechas, qué correos se envían y cómo se protege el formulario contra el spam sin cookies ni terceros (DSGVO).

## Decisión

- **Sistema propio** en lugar de gastronovi o Quandoo: los datos de los clientes quedan en nuestra base de datos y no hay widgets ni proveedores adicionales (DSGVO, sin consentimiento de terceros). El horario real se gestiona en el panel.
- **Confirmación manual + aforo por franja.** Toda reserva entra como `pending`; el personal la confirma o rechaza. Además cada franja tiene un aforo máximo (`capacity_per_slot`, 30 por defecto). La comprobación del aforo y la inserción se serializan con `SELECT … FOR UPDATE` sobre la fila de `reservation_settings`, así que dos peticiones simultáneas no pueden sobrepasarlo (409 `SLOT_FULL`).
- **Franjas de 30 minutos** sobre la rejilla de la zona `Europe/Berlin`; en la BD y en la API las fechas van en **UTC** y solo se convierten en la interfaz.
- **Mensaje al cliente editable.** Al confirmar, rechazar o cancelar, el personal ve el texto predeterminado (plantilla del idioma del cliente, editable en el panel) y puede cambiarlo antes de enviar. El asunto y el cuerpo realmente enviados se guardan en el historial de la reserva (`reservation_events`), junto con el resultado del envío (enviado, fallido, sin correo). Un correo fallido se puede reenviar.
- **Nodemailer + SMTP**, con **Mailpit** en desarrollo (nada sale a internet) y un mailer en memoria en los tests. Un fallo de correo nunca anula la reserva ni el cambio de estado.
- **Honeypot + límite de peticiones** (5 por 10 min e IP) en lugar de un captcha: sin cookies, sin terceros y sin fricción para las personas.
- **Anonimización a los 90 días** de la fecha de la reserva (`RESERVATIONS_RETENTION_DAYS`, mínimo 30), con la tarea diaria `npm run db:cleanup`.
- **Horario de apertura y cierres editables en el panel** (tablas `opening_hours` y `closures`). Absorbe parte de la fase 4. El horario sembrado es provisional hasta que el personal lo guarda (`hoursConfirmed`).

## Alternativas consideradas

- gastronovi / Quandoo — transfieren datos personales a un tercero, exigen contrato y enlace externo, y no encajan con «sin terceros».
- Aforo automático sin confirmación — el restaurante quiere decidir cada reserva (mesas, grupos grandes).
- Captcha (Turnstile, reCAPTCHA) — cookies o terceros y peor accesibilidad.
- Fechas en hora local en la BD — ambigüedad en el cambio de hora de verano.

## Consecuencias

- Hay que contratar un proveedor SMTP en la UE con contrato de encargo (AVV) antes de publicar; está marcado como pendiente en la Datenschutzerklärung y `check:publish` falla hasta que se rellene.
- La caché de ajustes es por proceso: se asume un único proceso de la API.
- El límite por IP puede afectar a quienes comparten NAT.
- El personal tiene más trabajo manual (confirmar), pero control total y un historial completo de lo que se dijo al cliente.
