# Seguridad y privacidad (DSGVO / RGPD) — Pachamama

El sitio está dirigido a público de habla alemana y trata datos personales (nombre, email, teléfono) ⇒ aplica el **RGPD / DSGVO**. Este documento es la guía técnica; los textos legales finales (Impressum, Datenschutzerklärung) deben revisarse por el responsable del restaurante o un asesor.

## Seguridad de la aplicación

| Tema         | Medida                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validación   | Todo input externo validado con Zod en el servidor (aunque ya se valide en el navegador)                                                                                                    |
| Autorización | Cada endpoint admin con `requireAuth` + `requireRole`; denegar por defecto                                                                                                                  |
| Sesiones     | Better Auth; cookies `httpOnly`, `secure` (`__Secure-pachamama.*`) en producción, `sameSite=lax`. Ver "Autenticación del personal"                                                          |
| Contraseñas  | Hash scrypt (Better Auth); 12–128 caracteres, sin reglas de complejidad (NIST SP 800-63B); sin registro público                                                                             |
| Cabeceras    | `helmet` con Content-Security-Policy estricta                                                                                                                                               |
| CORS         | Origen explícito (`WEB_ORIGIN`) y `credentials: true`; en dev, proxy de Vite (mismo origen)                                                                                                 |
| Abuso / spam | `express-rate-limit` en formularios públicos y login; honeypot; anti-bot (Turnstile u otro) a decidir                                                                                       |
| SQL          | Solo consultas parametrizadas (query builder/ORM), nunca concatenar SQL                                                                                                                     |
| Subidas      | Solo usuarios autenticados; lista blanca de tipos MIME y tamaño máximo; nombres de archivo generados                                                                                        |
| Importes     | Precios y totales calculados en el servidor                                                                                                                                                 |
| Secretos     | Solo en `.env` (fuera de Git); `.env.example` sin valores reales                                                                                                                            |
| Errores      | Sin trazas ni detalles internos en respuestas de producción                                                                                                                                 |
| Logs         | Sin datos personales ni tokens: los logs de peticiones solo guardan método, ruta (sin query) y estado; nada de IP, user agent ni cabeceras. La auditoría de login registra solo el `userId` |
| Dependencias | `npm audit` en CI; actualizaciones periódicas                                                                                                                                               |

## Autenticación del personal (fase 3)

| Tema                 | Medida                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta de usuarios     | Solo un admin (`npm run admin:create` o el panel). Sin registro público                                                                                                                                                                                                                                                 |
| Roles                | `admin` (gestiona usuarios, **sin** permiso de suplantar a otros) y `staff`. Rol desconocido o vacío → sin acceso                                                                                                                                                                                                       |
| Sesión               | 7 días, se renueva una vez al día con actividad; acciones sensibles exigen login de menos de 1 hora                                                                                                                                                                                                                     |
| Fuerza bruta         | 5 intentos de login por minuto e IP → 429. Contador en memoria (válido con un solo proceso de la API)                                                                                                                                                                                                                   |
| CSRF                 | Better Auth: comprobación de origen y Fetch Metadata. `/api/v1`: middleware `csrf` (Origin = `WEB_ORIGIN`, o `Sec-Fetch-Site: same-origin`; cuerpo solo JSON/multipart) en POST/PUT/PATCH/DELETE                                                                                                                        |
| Bloqueo              | Un usuario bloqueado pierde el acceso al momento, también con la sesión abierta                                                                                                                                                                                                                                         |
| Caché                | Todas las respuestas de `/api` llevan `Cache-Control: no-store` (equipos compartidos del local). Excepción: `/api/v1/menu` y `/api/v1/menu/pdf` (sin datos personales) usan `no-cache` + ETag                                                                                                                           |
| Límite de peticiones | `/api/v1`: 300/min por IP; `PUT /admin/menu/dishes/:id/image`: 30 por 10 min; `GET /menu/pdf`: 30/min (429 `RATE_LIMITED`, cabeceras `RateLimit`). Configurable con `RATE_LIMIT_API_PER_MIN`, `RATE_LIMIT_IMAGE_PER_10MIN`, `RATE_LIMIT_PDF_PER_MIN`; contador en memoria (un solo proceso) y IP real vía `TRUST_PROXY` |
| `/uploads`           | Fotos de la carta con `X-Content-Type-Options: nosniff`. En producción deben servirse **desde el mismo origen que la web** (nginx hace de proxy de `/uploads`): helmet pone `Cross-Origin-Resource-Policy: same-origin` y un origen distinto no podría cargarlas                                                        |

### Despliegue: IP real del cliente (obligatorio)

El límite de intentos depende de conocer la IP real. Express solo se fía de `X-Forwarded-For` si viene de un proxy de confianza (`TRUST_PROXY`, por defecto `loopback`), y pasa a Better Auth una única IP calculada por él.

- La API escucha **solo en local**: `API_HOST=127.0.0.1` (la validación de entorno lo exige en producción).
- nginx en el mismo servidor: `proxy_set_header X-Forwarded-For $remote_addr;` (sobrescribir).
- Si hubiera otro proxy delante (CDN), añadir su rango a `TRUST_PROXY`.

### Datos personales del personal (Beschäftigtendaten, § 26 BDSG)

| Dato                        | Dónde      | Para qué                              | Plazo                                                                                     |
| --------------------------- | ---------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| Nombre, email, rol          | `users`    | Acceso al panel                       | Mientras trabaje en el restaurante                                                        |
| IP y navegador de la sesión | `sessions` | Seguridad (detectar accesos extraños) | Hasta que caduca la sesión (máx. 7 días sin uso); `npm run db:cleanup` las borra a diario |

**Pendiente antes de publicar:** programar `npm run db:cleanup` a diario (cron) e incluir este tratamiento en la información al personal.

## Privacidad (DSGVO)

| Principio                   | Cómo se aplica                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Minimización                | Solo los datos necesarios: nombre, email, teléfono, comentario opcional. Sin cuentas de cliente                                        |
| Base legal / consentimiento | Casilla de aceptación de la política de privacidad en cada formulario; se guarda fecha y versión aceptada                              |
| Retención limitada          | Reservas y pedidos antiguos se anonimizan o borran tras un plazo (a definir); tarea programada                                         |
| Derechos del interesado     | Posibilidad de localizar y borrar/exportar los datos de una persona desde el panel                                                     |
| Cookies                     | Solo cookies técnicas (sesión del panel) ⇒ sin banner obligatorio mientras no haya analítica/terceros. Si se añaden, banner con opt-in |
| Terceros                    | Fuentes, mapas y vídeos embebidos pueden enviar datos a terceros: alojar fuentes en local; mapas/vídeos con carga tras consentimiento  |
| Hosting                     | Servidor y backups en la UE                                                                                                            |
| Emails                      | Proveedor SMTP con contrato de encargo de tratamiento (AVV)                                                                            |

## Páginas legales obligatorias

- **Impressum** (aviso legal, obligatorio en Alemania/Austria).
- **Datenschutzerklärung** (política de privacidad).
- Ambas en alemán y español, accesibles desde todas las páginas (pie de página).

## Revisión

Antes de cada despliegue a producción: ejecutar `/security-review` en Claude Code (o revisión equivalente) sobre los cambios.
