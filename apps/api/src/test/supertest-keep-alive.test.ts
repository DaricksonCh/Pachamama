import type { Socket } from 'node:net';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

// Guarda de regresión del workaround de setup.ts (ver supertest-keep-alive.ts):
// las peticiones de un archivo reutilizan la conexión en vez de abrir una nueva cada vez.
describe('supertest en los tests (workaround Node 24.15 / Windows)', () => {
  it('reutiliza la misma conexión TCP entre peticiones a la misma app', async () => {
    const sockets = new Set<Socket>();
    const app = express();
    app.get('/ping', (req, res) => {
      sockets.add(req.socket);
      res.json({ ok: true });
    });

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).get('/ping');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    }

    expect(sockets.size).toBe(1);
  });

  it('sigue funcionando con POST, cabeceras y cuerpo JSON', async () => {
    const app = express();
    app.use(express.json());
    app.post('/echo', (req, res) => {
      res.status(201).json({ body: req.body, origin: req.get('origin') });
    });

    const res = await request(app)
      .post('/echo')
      .set('Origin', 'http://localhost:5173')
      .send({ a: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ body: { a: 1 }, origin: 'http://localhost:5173' });
  });
});
