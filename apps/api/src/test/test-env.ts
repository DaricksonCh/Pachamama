import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseEnv } from 'node:util';

/** Lanza si la base no es de tests. Es el seguro que impide vaciar la BD real. */
export function assertTestDatabaseName(dbName: string | null | undefined): void {
  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error(
      `Tests: la BD "${dbName ?? '(ninguna)'}" no termina en _test. Abortado para proteger datos.`,
    );
  }
}

/**
 * URL de la BD de tests. Prioridad: TEST_DATABASE_URL (CI) → DATABASE_URL del .env local
 * con la base cambiada a `pachamama_test`. Aborta si la base no termina en `_test`:
 * los tests vacían tablas y NUNCA deben tocar la BD real.
 */
export function resolveTestDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
  readEnvFile: () => string | undefined = readLocalEnvFile,
): string {
  let url = env.TEST_DATABASE_URL;

  if (!url) {
    const content = readEnvFile();
    const base = content ? parseEnv(content).DATABASE_URL : undefined;
    if (!base) {
      throw new Error('Tests: define TEST_DATABASE_URL o DATABASE_URL en .env');
    }
    const parsed = new URL(base);
    parsed.pathname = '/pachamama_test';
    url = parsed.toString();
  }

  assertTestDatabaseName(new URL(url).pathname.slice(1));
  return url;
}

function readLocalEnvFile() {
  const envFile = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].find(
    existsSync,
  );
  return envFile ? readFileSync(envFile, 'utf8') : undefined;
}

/** Variables de entorno de los tests (se fijan antes de importar la app). */
export function applyTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.DATABASE_URL = resolveTestDatabaseUrl();
  process.env.BETTER_AUTH_SECRET = 'test-only-secret-0123456789abcdefghijklmnop';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.WEB_ORIGIN = 'http://localhost:5173';
  process.env.TRUST_PROXY = 'loopback';
  // Cada proceso escribe sus fotos en un directorio temporal propio (nunca en el repo).
  process.env.UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'pachamama-uploads-'));
}
