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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  DATABASE_URL: z.url().startsWith('mysql://', { error: 'DATABASE_URL debe empezar por mysql://' }),
  BETTER_AUTH_SECRET: z.string().min(32, { error: 'BETTER_AUTH_SECRET necesita 32+ caracteres' }),
  BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
