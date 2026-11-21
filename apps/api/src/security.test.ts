import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler';

const app = createApp();

describe('cabeceras de seguridad (helmet)', () => {
  it('envía las cabeceras básicas de endurecimiento', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS', () => {
  it('permite el origen de la web con credenciales', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', env.WEB_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(env.WEB_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no autoriza a un origen ajeno', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');

    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });
});

describe('entradas maliciosas o mal formadas', () => {
  // App mínima con el mismo parser y manejador de errores, para ejercitar el cuerpo de la petición.
  const echo = express();
  echo.use(express.json({ limit: '100kb' }));
  echo.post('/echo', (req, res) => {
    res.json({ received: req.body });
  });
  echo.use(errorHandler);

  it('responde 400 con formato estándar ante JSON roto (sin filtrar el error interno)', async () => {
    const res = await request(echo)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"name": "Pacha');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'INVALID_JSON', message: 'Malformed JSON body' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|at JSON\.parse/);
  });

  it('rechaza cuerpos de más de 100 kB con 413', async () => {
    const res = await request(echo)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ note: 'x'.repeat(150_000) }));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('no permite contaminar el prototipo con __proto__', async () => {
    await request(echo)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"__proto__": {"polluted": true}}');

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('la API real responde 404 estándar a métodos o rutas no previstos', async () => {
    const res = await request(app).delete('/api/v1/health');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
