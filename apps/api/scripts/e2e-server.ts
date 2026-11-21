/**
 * API para los e2e: igual que la real pero contra la BD `pachamama_test` y en el puerto 3100.
 * Nunca se conecta a la BD de desarrollo (applyTestEnv aborta si la base no termina en _test).
 */
import { applyTestEnv } from '../src/test/test-env';

applyTestEnv();
process.env.API_PORT = process.env.E2E_API_PORT ?? '3100';
process.env.WEB_ORIGIN = process.env.E2E_WEB_ORIGIN ?? 'http://localhost:5174';
process.env.BETTER_AUTH_URL = process.env.WEB_ORIGIN;

await import('../src/server');
