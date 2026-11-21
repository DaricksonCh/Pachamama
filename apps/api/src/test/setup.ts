import type supertest from 'supertest';
import { afterAll, vi } from 'vitest';
import { closeKeepAliveServers } from './supertest-keep-alive';
import { applyTestEnv } from './test-env';

// Se ejecuta antes de cada archivo de test, antes de que se importe config/env.ts.
applyTestEnv();

// Node 24.15.0 en Windows se cae (0xC0000409) al abrir conexiones TCP: supertest reutiliza
// un servidor y conexiones keep-alive por archivo. Detalle en supertest-keep-alive.ts.
vi.mock('supertest', async (importOriginal) => {
  const { withKeepAlive } = await import('./supertest-keep-alive');
  const original = await importOriginal<{ default: typeof supertest }>();
  return { default: withKeepAlive(original.default) };
});

afterAll(async () => {
  await closeKeepAliveServers();
});
