import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * URL de la BD de tests. Prioridad: TEST_DATABASE_URL (CI) → DATABASE_URL del .env local
 * con la base cambiada a `pachamama_test`. Aborta si la base no termina en `_test`:
 * los tests vacían tablas y NUNCA deben tocar la BD real.
 */
export function resolveTestDatabaseUrl(): string {
  let url = process.env.TEST_DATABASE_URL;

  if (!url) {
    const envFile = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].find(
      existsSync,
    );
    const base = envFile ? parseEnv(readFileSync(envFile, 'utf8')).DATABASE_URL : undefined;
    if (!base) {
      throw new Error('Tests: define TEST_DATABASE_URL o DATABASE_URL en .env');
    }
    const parsed = new URL(base);
    parsed.pathname = '/pachamama_test';
    url = parsed.toString();
  }

  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(`Tests: la BD "${dbName}" no termina en _test. Abortado para proteger datos.`);
  }
  return url;
}

/** Variables de entorno de los tests (se fijan antes de importar la app). */
export function applyTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.DATABASE_URL = resolveTestDatabaseUrl();
  process.env.BETTER_AUTH_SECRET = 'test-only-secret-0123456789abcdefghijklmnop';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.WEB_ORIGIN = 'http://localhost:5173';
}
