import type { Express } from 'express';
import request from 'supertest';
import { expect } from 'vitest';
import { auth } from '../auth/auth';
import { createStaffUser } from '../auth/create-staff-user';
import { resetAuthTables, uniqueIp } from './db-helpers';

export const ORIGIN = 'http://localhost:5173';
export const ADMIN = {
  name: 'Ana Admin',
  email: 'admin@pachamama.test',
  password: 'Admin-Passw0rd-123',
};
export const STAFF = {
  name: 'Sergio Staff',
  email: 'staff@pachamama.test',
  password: 'Staff-Passw0rd-123',
};

export function signIn(app: Express, email: string, password: string, ip = uniqueIp()) {
  return request(app)
    .post('/api/auth/sign-in/email')
    .set('Origin', ORIGIN)
    .set('X-Forwarded-For', ip)
    .send({ email, password });
}

/** Inicia sesión y devuelve la cookie de sesión lista para reenviar. */
export async function loginCookie(app: Express, email: string, password: string) {
  const res = await signIn(app, email, password);
  expect(res.status).toBe(200);
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

/** Vacía las tablas de auth y crea el admin y el staff de prueba. */
export async function seedStaffUsers() {
  await resetAuthTables();
  await createStaffUser(auth, { ...ADMIN, role: 'admin' });
  await createStaffUser(auth, { ...STAFF, role: 'staff' });
}
