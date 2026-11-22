import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { errorHandler } from './error-handler';

vi.mock('../lib/logger', () => ({ logger: { error: vi.fn() } }));

function app() {
  const a = express();
  a.get('/boom', () => {
    throw new Error("ER_DUP_ENTRY: Duplicate entry 'secret' for key 'dishes.x'");
  });
  a.use(errorHandler);
  return a;
}

const original = env.NODE_ENV;
afterEach(() => {
  env.NODE_ENV = original;
});

describe('errorHandler (500)', () => {
  it('en producción no expone el texto del error', async () => {
    env.NODE_ENV = 'production';
    const res = await request(app()).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    expect(JSON.stringify(res.body)).not.toContain('ER_DUP_ENTRY');
  });
});
