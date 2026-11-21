import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { normalizeClientIp } from './client-ip';

/** App mínima que simula la IP del socket (supertest siempre conecta desde 127.0.0.1). */
function appWithSocketIp(socketIp?: string) {
  const app = express();
  app.set('trust proxy', 'loopback');
  app.use((req, _res, next) => {
    if (socketIp) Object.defineProperty(req.socket, 'remoteAddress', { value: socketIp });
    next();
  });
  app.use(normalizeClientIp);
  app.get('/', (req, res) => {
    res.json({ xff: req.headers['x-forwarded-for'] ?? null });
  });
  return app;
}

describe('IP fiable del cliente (X-Forwarded-For)', () => {
  it('un cliente externo no puede inventarse la IP: se usa la del socket', async () => {
    const res = await request(appWithSocketIp('203.0.113.50'))
      .get('/')
      .set('X-Forwarded-For', '1.2.3.4');
    expect(res.body.xff).toBe('203.0.113.50');
  });

  it('detrás de un proxy local, se toma la IP que añade el proxy (la última)', async () => {
    const res = await request(appWithSocketIp())
      .get('/')
      .set('X-Forwarded-For', '1.2.3.4, 198.51.100.7');
    expect(res.body.xff).toBe('198.51.100.7');
  });

  it('sin cabecera, la IP es la de la conexión', async () => {
    const res = await request(appWithSocketIp('198.51.100.20')).get('/');
    expect(res.body.xff).toBe('198.51.100.20');
  });
});
