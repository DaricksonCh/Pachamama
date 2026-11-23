# Pendientes del restaurante

Datos que **faltan o son provisionales**. Aquí se van anotando a medida que aparecen; cuando el restaurante confirme un dato, se cambia en la web (o en el panel `/admin`) y se marca como hecho.

Regla: **no se publica** la web con datos marcados como provisionales sin que el usuario lo apruebe. `npm run check:publish` lo comprueba (datos del restaurante y legales, teléfono/email de relleno, lorem ipsum, platos provisionales visibles y fotos que faltan en disco) y debe estar en verde antes de publicar (M4).

Leyenda: ⏳ pendiente · ✅ confirmado

## Datos de contacto y horario

| Dato      | Valor provisional                                                                                              | Estado |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| Horario   | Martes a domingo, 13:00–22:00 · Lunes cerrado (el horario real se guarda desde `/admin/reservations/settings`) | ⏳     |
| Dirección | Am Gaswerk 1, 28197 Bremen                                                                                     | ✅     |
| Teléfono  | +49 1521 4982818 (confirmado por el usuario el 2026-11-23)                                                     | ✅     |
| Email     | pachamamarestaurantperu@gmail.com (confirmado por el usuario el 2026-11-23)                                    | ✅     |
| Reservas  | Email que recibe los avisos de reservas: PENDIENTE                                                             | ⏳     |
| Dominio   | Se compra uno nuevo al publicar (el anterior caducó)                                                           | ⏳     |
| Logo SVG  | Solo hay PNG de 600 px; falta el vectorial original                                                            | ⏳     |

## Técnico antes de publicar

| Tema                          | Situación                                                                                                                                                                                                                                | Estado |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Fotos de platos               | 5 platos visibles apuntan a fotos que no están en `apps/api/uploads` (Tamal de Pollo, Causa veggie, Solterito, Empanadas, Jalea Mixta). Volver a subirlas desde el panel o recargar la carta con `--photos` en el servidor.              | ⏳     |
| Mapa de Contacto              | `apps/web/public/images/map/kontakt-karte.webp`: 9 teselas de tile.openstreetmap.org (zoom 16, descarga única autorizada el 2026-11-22, coordenadas de Nominatim 53.07536, 8.78354), unidas en local. © OpenStreetMap-Mitwirkende, ODbL. | ✅     |
| Proveedor SMTP + AVV          | Elegir proveedor SMTP en la UE y firmar el contrato de encargo; rellenar `legal.smtpProvider` (Datenschutz) y las variables SMTP del servidor. `check:publish` falla hasta entonces.                                                     | ⏳     |
| Retención del buzón de avisos | Fijar cuánto tiempo se conservan los correos de aviso en el buzón del restaurante y en el proveedor de correo; rellenar `legal.mailboxRetention` (Datenschutz). `check:publish` falla hasta entonces.                                    | ⏳     |
| Cron de `db:cleanup`          | Programar a diario en el servidor (sesiones caducadas y anonimización de reservas a los 90 días)                                                                                                                                         | ⏳     |
| Logs del servidor (IPs)       | Cuadrar la Datenschutzerklärung con la configuración real de nginx (qué se guarda y cuánto tiempo)                                                                                                                                       | ⏳     |
| Fotos más grandes             | Causa y quinua solo tienen versión de 640 px (se ven algo blandas en pantallas retina)                                                                                                                                                   | ⏳     |
| Fotos de la portada           | «Aus unserer Küche» (Ceviche Clásico, Lomo Saltado, Causa Limeña): ceviche y lomo usan un recorte provisional de `mesa-surtida`. Sustituir por fotos profesionales en `kitchen-section.tsx` cuando lleguen.                              | ⏳     |
| Precios de la portada         | Los 3 platos de la portada toman el precio de la carta buscando su nombre en alemán. Si se renombra uno en `/admin`, su tarjeta sale sin precio: actualizar `FEATURED` en `kitchen-section.tsx`.                                         | ⏳     |

## Impressum (obligatorio en Alemania)

| Dato                                                                             | Valor                           | Estado |
| -------------------------------------------------------------------------------- | ------------------------------- | ------ |
| Razón social / nombre                                                            | PENDIENTE                       | ⏳     |
| Titular o representante                                                          | PENDIENTE                       | ⏳     |
| Dirección legal                                                                  | PENDIENTE                       | ⏳     |
| USt-IdNr. (número de IVA)                                                        | PENDIENTE                       | ⏳     |
| Registro mercantil (si hay)                                                      | PENDIENTE                       | ⏳     |
| Forma jurídica                                                                   | PENDIENTE                       | ⏳     |
| Responsable del contenido (§ 18 Abs. 2 MStV)                                     | PENDIENTE                       | ⏳     |
| Confirmar que la dirección legal es la del local                                 | Provisional (usa Am Gaswerk 1)  | ⏳     |
| Confirmar «ni dispuestos ni obligados» a arbitraje de consumo (§ 36 VSBG)        | Texto provisional               | ⏳     |
| Proveedor de hosting (UE) y contrato de encargo (AVV)                            | PENDIENTE                       | ⏳     |
| Plazo de conservación de los logs del servidor web (nginx)                       | PENDIENTE (la API no guarda IP) | ⏳     |
| Revisión jurídica de Impressum y Datenschutzerklärung por el titular o un asesor | Textos en borrador (22.11.2026) | ⏳     |

## Contenidos

| Contenido                     | Situación                                       | Estado |
| ----------------------------- | ----------------------------------------------- | ------ |
| Historia del restaurante      | Texto de relleno (lorem ipsum)                  | ⏳     |
| Textos en español de la carta | Traducidos del alemán/inglés por la IA; revisar | ⏳     |

## Carta (del PDF `material/menu/menu.pdf`)

Dudas encontradas al pasar la carta a la base de datos (`npm run db:seed:menu`). Cada plato afectado se carga visible con el valor más probable, marcado como "provisional" y con la duda en la nota, para corregirlo desde el panel.

| Plato                                     | Duda                                                                                                                                                                                                                 | Estado |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Papa rellena vegan                        | Aparecen dos precios: 8,50 € y 8,00 €. Cargado con 8,50 € (junto al nombre)                                                                                                                                          | ⏳     |
| Tamal de Pollo                            | Sin precio claro: cargado con 8,00 € (precio suelto de la página)                                                                                                                                                    | ⏳     |
| Causa Acevichada                          | Dos precios: 13,00 € y 10,00 €. Cargado con 13,00 € (junto al nombre)                                                                                                                                                | ⏳     |
| Tiradito                                  | Sin precio en el PDF: se pone 13,00 € provisional (decidido el 2026-11-21)                                                                                                                                           | ⏳     |
| Anticuchos Veganos / de Carne             | Precios 15,00 € y 17,90 €: ¿cuál es de cada uno? Cargados veganos 15,00 € y de carne 17,90 €                                                                                                                         | ⏳     |
| Crema de Oliva / Crema Pikante            | Precios 4,00 € y 1,90 €: ¿cuál es de cada uno? Cargadas Oliva 4,00 € y Pikante 1,90 €                                                                                                                                | ⏳     |
| Arroz Chaufa Vegano / Vegetarian          | Alérgeno "R" no existe en la lista (A–N): descartado (el Mixto no lo lleva)                                                                                                                                          | ⏳     |
| Platos sin alérgenos                      | Tamal vegan, Causa veggie, Ceviche de Setas, Seco a la Norteña, Seco a la limeña, Arroz con Pollo, Anticuchos (los 4), Tostones, Yuca frita, extras y dips                                                           | ⏳     |
| Ceviche de Setas / Aji de Champiñones     | El PDF dice "Pilsen/Pilse" (cerveza): se interpreta como "Pilze" (setas)                                                                                                                                             | ⏳     |
| Arroz con Marisco                         | La versión inglesa dice "chocolate"; se interpreta como "choclo"                                                                                                                                                     | ⏳     |
| Alérgenos que faltan según la descripción | Leche de Tigre (apio → I), Ceviche entrante (apio, calamar, pulpo, mejillones → I, N), Arroz Chaufa (sésamo → K; el vegetariano lleva huevo → C), Ají de Gallina (huevo → C), Causa veggie y Huevo frito (huevo → C) | ⏳     |
| Arroz Chaufa Vegano                       | Lleva salsa de ostión (N): no es vegano. Mientras tanto va SIN etiqueta vegana. ¿Se cambia la salsa (y se pone la etiqueta) o se renombra el plato?                                                                  | ⏳     |
| Chicharrón de Calamar                     | En el PDF está en la página de sopas y ensaladas; se ha dejado ahí (se mueve desde el panel)                                                                                                                         | ⏳     |

## Diseño y PDF (anotado por el usuario el 2026-11-22)

| Tarea                          | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Estado |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| PDF de la carta sin fotos      | No cargar las fotos de los platos en el PDF: rompen el diseño (se montan unas sobre otras) y suponen un gasto innecesario de generación y peso.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | ⏳     |
| Revisar diseño en dispositivos | Revisar la web en distintos dispositivos; el diseño actual no resulta muy agradable y puede cambiar. Idea de referencia: [muchosmas.eu/la-historia](https://www.muchosmas.eu/la-historia): bloques alternos en bucle (texto a la izquierda y foto a la derecha; debajo, foto a la izquierda y texto a la derecha), con texto principal (lorem por ahora) y foto de fondo. **Historia rediseñada el 23.11.2026 (ADR 0013, maqueta D) y Contacto el mismo día (ADR 0014, postal + quipu)**; faltan las demás páginas con la misma regla de bloques. Inicio y el pie aún muestran el horario fijo: pasarlos a `GET /api/v1/opening-hours`. | ⏳     |

## Fase 7 — mejoras menores

Hallazgos de las revisiones que no se corrigieron en el momento (ni seguridad ni accesibilidad).

- "1 personas/Personen" en plural en las plantillas de correo.
- Carrera en la caché de ajustes mientras hay una carga en curso.
- La caché de ajustes es por proceso (se asume un único proceso de la API).
- El tiempo de respuesta del honeypot se distingue del de una reserva real.
- El límite por IP puede afectar a quienes comparten NAT.
- Un reenvío entre el commit del PATCH y el envío del correo puede duplicar el mensaje.
- El calendario de la web se limita a 12 meses.
- La disponibilidad del mes ignora el tamaño del grupo.
- Faltan tests: refresco de «hoy», tramos del contador, formulario de añadir cierre y payload al guardar una plantilla.
- `check:publish` no comprueba las variables SMTP (`SMTP_HOST`, `MAIL_FROM`, TLS); solo las valida el arranque en producción.
- `closureSchema` no limita el rango máximo de un cierre.
- El SQL de la retención (anonimización) vive fuera del repositorio de reservas.
- Tipos duplicados: `EmailKind`, `ReservationLang` y `ReservationMessageKind` existen en la API y en `shared`.
- `PATCH` de ajustes se ejecuta sin transacción.
- El límite de reservas por IP y las redes con NAT compartido: revisar antes de M4.
- La guarda de publicación comprueba la subcadena `/example/`.
- La retención usa una lista IN sin límite si hay un atraso enorme.
- `createMemoryMailer` vive en un archivo de producción.

## Historia (ADR 0013) — mejoras menores

- Pista de teclado (`aria-describedby`) en la pista de fotos de la galería.
- El bloque del nombre se lee «Pacha igual tierra»: valorar una lista de definiciones o un `aria-label`.
