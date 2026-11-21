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

const envSchema = z
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
  })
  .superRefine((env, ctx) => {
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
