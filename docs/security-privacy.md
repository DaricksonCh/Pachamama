# Seguridad y privacidad (DSGVO / RGPD) — Pachamama

El sitio está dirigido a público de habla alemana y trata datos personales (nombre, email, teléfono) ⇒ aplica el **RGPD / DSGVO**. Este documento es la guía técnica; los textos legales finales (Impressum, Datenschutzerklärung) deben revisarse por el responsable del restaurante o un asesor.

## Seguridad de la aplicación

| Tema         | Medida                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Validación   | Todo input externo validado con Zod en el servidor (aunque ya se valide en el navegador)              |
| Autorización | Cada endpoint admin con `requireAuth` + `requireRole`; denegar por defecto                            |
| Sesiones     | Better Auth; cookies `httpOnly`, `secure` en producción, `sameSite=lax`                               |
| Contraseñas  | Gestionadas y hasheadas por Better Auth; sin registro público                                         |
| Cabeceras    | `helmet` con Content-Security-Policy estricta                                                         |
| CORS         | Origen explícito (`WEB_ORIGIN`) y `credentials: true`; en dev, proxy de Vite (mismo origen)           |
| Abuso / spam | `express-rate-limit` en formularios públicos y login; honeypot; anti-bot (Turnstile u otro) a decidir |
| SQL          | Solo consultas parametrizadas (query builder/ORM), nunca concatenar SQL                               |
| Subidas      | Solo usuarios autenticados; lista blanca de tipos MIME y tamaño máximo; nombres de archivo generados  |
| Importes     | Precios y totales calculados en el servidor                                                           |
| Secretos     | Solo en `.env` (fuera de Git); `.env.example` sin valores reales                                      |
| Errores      | Sin trazas ni detalles internos en respuestas de producción                                           |
| Logs         | Sin datos personales ni tokens                                                                        |
| Dependencias | `npm audit` en CI; actualizaciones periódicas                                                         |

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
