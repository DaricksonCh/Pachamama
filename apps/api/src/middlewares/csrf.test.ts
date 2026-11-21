import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../config/env';
import { createApp } from '../app';
import { csrfProtection, isAllowedOrigin } from './csrf';
import { errorHandler } from './error-handler';

function app() {
  const a = express();
  a.use(express.json());
  a.use(csrfProtection);
  a.all('/x', (_req, res) => {
    res.json({ ok: true });
  });
  a.use(errorHandler);
  return a;
}

const origin = env.WEB_ORIGIN;

describe('protección CSRF de /api/v1', () => {
  it('POST con Origin correcto y JSON pasa', async () => {
    const res = await request(app()).post('/x').set('Origin', origin).send({ a: 1 });
    expect(res.status).toBe(200);
  });

  it('POST sin Origin ni Sec-Fetch-Site se rechaza', async () => {
    const res = await request(app()).post('/x').send({ a: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });

  it('POST con otro Origin se rechaza', async () => {
    const res = await request(app()).post('/x').set('Origin', 'https://evil.example').send({});
    expect(res.status).toBe(403);
  });

  it('Origin: null se rechaza', async () => {
    const res = await request(app()).post('/x').set('Origin', 'null').send({});
    expect(res.status).toBe(403);
  });

  it('Content-Type text/plain con Origin correcto se rechaza', async () => {
    const res = await request(app())
      .post('/x')
      .set('Origin', origin)
      .set('Content-Type', 'text/plain')
      .send('hola');
    expect(res.status).toBe(403);
  });

  it('sin Origin, Sec-Fetch-Site same-origin pasa', async () => {
    const res = await request(app()).post('/x').set('Sec-Fetch-Site', 'same-origin').send({});
    expect(res.status).toBe(200);
  });

  it('sin Origin, Sec-Fetch-Site cross-site se rechaza', async () => {
    const res = await request(app()).post('/x').set('Sec-Fetch-Site', 'cross-site').send({});
    expect(res.status).toBe(403);
  });

  it('DELETE sin cuerpo con Origin correcto pasa', async () => {
    const res = await request(app()).delete('/x').set('Origin', origin);
    expect(res.status).toBe(200);
  });

  it('GET sin Origin pasa', async () => {
    const res = await request(app()).get('/x');
    expect(res.status).toBe(200);
  });

  it('isAllowedOrigin falla cerrado si el origen permitido no es válido', () => {
    expect(isAllowedOrigin('null', null)).toBe(false);
    expect(isAllowedOrigin('http://localhost:5173', null)).toBe(false);
    expect(isAllowedOrigin('http://localhost:5173/', 'http://localhost:5173')).toBe(true);
  });

  it('el tipo de medio debe coincidir exactamente', async () => {
    const res = await request(app())
      .post('/x')
      .set('Origin', origin)
      .set('Content-Type', 'application/jsonfoo')
      .send('{}');
    expect(res.status).toBe(403);
  });

  it('acepta parámetros y mayúsculas en Content-Type', async () => {
    for (const type of ['application/json; charset=utf-8', 'Application/JSON']) {
      const res = await request(app())
        .post('/x')
        .set('Origin', origin)
        .set('Content-Type', type)
        .send('{}');
      expect(res.status).toBe(200);
    }
  });

  it('multipart/form-data pasa la comprobación', async () => {
    const res = await request(app())
      .post('/x')
      .set('Origin', origin)
      .set('Content-Type', 'multipart/form-data; boundary=x')
      .send('--x--');
    expect(res.status).toBe(200);
  });

  it('un cuerpo sin Content-Type se rechaza', async () => {
    const res = await request(app())
      .post('/x')
      .set('Origin', origin)
      .unset('Content-Type')
      .send(Buffer.from('abc'));
    expect(res.status).toBe(403);
  });

  it('createApp monta la protección en /api/v1', async () => {
    const res = await request(createApp()).post('/api/v1/health').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });
});
