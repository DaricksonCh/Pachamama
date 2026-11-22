import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// Carga el primer .env que exista: el de la carpeta actual o el de la raíz del monorepo.
// Las variables ya definidas en el entorno (p. ej. en CI o producción) tienen prioridad.
// En los tests (Vitest) no se lee .env: el setup de tests fija una BD de pruebas aparte.
if (!process.env.VITEST) {
  for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      break;
    }
  }
}

/** `trust proxy` de Express: número de saltos, lista de IPs/subredes o palabras como `loopback`. */
const trustProxySchema = z
  .string()
  .default('loopback')
  .transform((value) => (/^\d+$/.test(value) ? Number(value) : value));

const emptyToUndefined = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/** Exportado solo para poder probar las reglas de producción. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    /** Interfaz de escucha. En producción: 127.0.0.1 (solo accesible a través de nginx). */
    API_HOST: z.string().optional(),
    TRUST_PROXY: trustProxySchema,
    WEB_ORIGIN: z.url().default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    DATABASE_URL: z
      .url()
      .startsWith('mysql://', { error: 'DATABASE_URL debe empezar por mysql://' }),
    BETTER_AUTH_SECRET: z.string().min(32, { error: 'BETTER_AUTH_SECRET necesita 32+ caracteres' }),
    BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
    /** Carpeta de las fotos subidas (se sirve en /uploads). En producción: fuera del repo y con copia de seguridad. */
    UPLOADS_DIR: z.string().min(1).default('./uploads'),
    /** Límites de peticiones por IP (ver middlewares/rate-limit.ts). */
    RATE_LIMIT_API_PER_MIN: z.coerce.number().int().positive().default(300),
    RATE_LIMIT_IMAGE_PER_10MIN: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_PDF_PER_MIN: z.coerce.number().int().positive().default(30),
    /** Correo (SMTP). En desarrollo: Mailpit en localhost:1025 (ver docs/tooling.md). */
    SMTP_HOST: z.string().min(1).default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    // Un valor vacío en .env equivale a no definirlo.
    SMTP_USER: emptyToUndefined,
    SMTP_PASS: emptyToUndefined,
    MAIL_FROM: z.string().min(1).default('Pachamama <reservierung@localhost>'),
    /** Dirección del personal que recibe el aviso de cada solicitud de reserva. */
    RESERVATIONS_NOTIFY_EMAIL: z.string().min(1).default('reservierung@localhost'),
  })
  .superRefine((env, ctx) => {
    if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASS)) {
      ctx.addIssue({
        code: 'custom',
        path: [env.SMTP_USER ? 'SMTP_PASS' : 'SMTP_USER'],
        message: 'SMTP_USER y SMTP_PASS deben definirse juntos',
      });
    }
    if (env.NODE_ENV !== 'production') return;
    // En producción no se aceptan valores de desarrollo ni marcadores sin rellenar.
    for (const key of ['WEB_ORIGIN', 'BETTER_AUTH_URL'] as const) {
      if (!env[key].startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} debe usar https en producción`,
        });
      }
    }
    for (const key of ['DATABASE_URL', 'BETTER_AUTH_SECRET'] as const) {
      if (env[key].includes('CHANGE_ME')) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} sigue con el valor de ejemplo`,
        });
      }
    }
    const smtpHost = env.SMTP_HOST.trim().toLowerCase();
    if (
      ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'].includes(smtpHost) ||
      smtpHost.endsWith('.localhost')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST no puede ser localhost en producción',
      });
    }
    for (const key of ['MAIL_FROM', 'RESERVATIONS_NOTIFY_EMAIL'] as const) {
      if (/localhost|example/i.test(env[key])) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} sigue con un valor de ejemplo`,
        });
      }
    }
    if (!env.API_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['API_HOST'],
        message:
          'En producción define API_HOST=127.0.0.1 (la API solo se expone a través de nginx)',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
