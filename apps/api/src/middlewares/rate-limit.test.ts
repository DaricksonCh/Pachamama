import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// Límites pequeños, fijados antes de que se cargue config/env (el setup pone valores altos).
vi.hoisted(() => {
  process.env.RATE_LIMIT_API_PER_MIN = '8';
  process.env.RATE_LIMIT_IMAGE_PER_10MIN = '2';
  process.env.RATE_LIMIT_PDF_PER_MIN = '2';
});

const { createApp } = await import('../app');
const { env } = await import('../config/env');

const app = createApp();
const ORIGIN = env.WEB_ORIGIN;
const { ADMIN, loginCookie, seedStaffUsers } = await import('../test/auth-helpers');
const ip = (n: number) => `10.9.0.${n}`;

describe('límite de peticiones de /api/v1', () => {
  it('las respuestas normales llevan cabeceras RateLimit estándar', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Forwarded-For', ip(1));

    expect(res.status).toBe(200);
    expect(res.headers['ratelimit']).toMatch(/limit=8/);
    expect(res.headers['ratelimit-policy']).toMatch(/8;w=60/);
  });

  it('429 con formato de error estándar al superar el límite general, por IP', async () => {
    // loopback es proxy de confianza: X-Forwarded-For fija la IP del cliente.
    for (let i = 0; i < 8; i++) {
      const ok = await request(app).get('/api/v1/health').set('X-Forwarded-For', ip(2));
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app).get('/api/v1/health').set('X-Forwarded-For', ip(2));
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers['retry-after']).toBeDefined();

    const other = await request(app).get('/api/v1/health').set('X-Forwarded-For', ip(3));
    expect(other.status).toBe(200);
  });

  it('GET /menu/pdf: 429 tras 2 peticiones por minuto', async () => {
    const get = () => request(app).get('/api/v1/menu/pdf').set('X-Forwarded-For', ip(4));
    // Cuentan aunque la respuesta sea un error: el límite va antes del render.
    expect((await get()).status).not.toBe(429);
    expect((await get()).status).not.toBe(429);
    const res = await get();
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('PUT imagen de plato: 429 tras 2 peticiones en 10 minutos', async () => {
    await seedStaffUsers();
    const cookie = await loginCookie(app, ADMIN.email, ADMIN.password);
    const put = () =>
      request(app)
        .put('/api/v1/admin/menu/dishes/1/image')
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .set('X-Forwarded-For', ip(5));
    expect((await put()).status).not.toBe(429);
    expect((await put()).status).not.toBe(429);
    const res = await put();
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('/uploads', () => {
  it('sirve los archivos con X-Content-Type-Options: nosniff', async () => {
    mkdirSync(env.UPLOADS_DIR, { recursive: true });
    writeFileSync(join(env.UPLOADS_DIR, 'nosniff.txt'), 'hola');

    const res = await request(app).get('/uploads/nosniff.txt');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
