import { staffUserSchema } from '@pachamama/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { createApp } from '../app';
import { db } from '../db/database';
import {
  ADMIN,
  loginCookie as loginCookieWith,
  ORIGIN,
  seedStaffUsers,
  signIn as signInWith,
  STAFF,
} from '../test/auth-helpers';
import { uniqueIp } from '../test/db-helpers';
import { auth } from './auth';
import { createStaffUser } from './create-staff-user';

const app = createApp();
function signIn(email: string, password: string, ip?: string) {
  return signInWith(app, email, password, ip);
}

function loginCookie(email: string, password: string) {
  return loginCookieWith(app, email, password);
}

beforeEach(async () => {
  await seedStaffUsers();
});

describe('alta de usuarios', () => {
  it('guarda la contraseña con hash, nunca en claro', async () => {
    const account = await db
      .selectFrom('accounts')
      .innerJoin('users', 'users.id', 'accounts.userId')
      .select(['accounts.password', 'accounts.providerId'])
      .where('users.email', '=', ADMIN.email)
      .executeTakeFirstOrThrow();

    expect(account.providerId).toBe('credential');
    expect(account.password).not.toContain(ADMIN.password);
    expect(account.password?.length).toBeGreaterThan(60);
  });

  it('rechaza emails duplicados y contraseñas cortas', async () => {
    await expect(createStaffUser(auth, { ...ADMIN, role: 'admin' })).rejects.toThrow(/Ya existe/);
    await expect(
      createStaffUser(auth, {
        name: 'X Y',
        email: 'x@pachamama.test',
        password: 'corta',
        role: 'staff',
      }),
    ).rejects.toThrow(ZodError);
  });

  it('normaliza el email (espacios y mayúsculas) al crear el usuario', async () => {
    const user = await createStaffUser(auth, {
      name: 'Eva Espacios',
      email: '  Eva@Pachamama.TEST ',
      password: 'Eva-Passw0rd-12345',
      role: 'staff',
    });
    expect(user.email).toBe('eva@pachamama.test');
  });

  it('no permite registrarse desde fuera (sin registro público)', async () => {
    const res = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', uniqueIp())
      .send({ name: 'Intruso', email: 'intruso@evil.test', password: 'Intruso-Passw0rd-1' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    const created = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', 'intruso@evil.test')
      .executeTakeFirst();
    expect(created).toBeUndefined();
  });
});

describe('login', () => {
  it('inicia sesión con cookie httpOnly y SameSite', async () => {
    const res = await signIn(ADMIN.email, ADMIN.password);

    expect(res.status).toBe(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const session = cookies.find((c) => c.startsWith('pachamama.session_token='));
    expect(session).toBeDefined();
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(JSON.stringify(res.body)).not.toContain(ADMIN.password);
  });

  it('acepta el email sin distinguir mayúsculas', async () => {
    const res = await signIn(ADMIN.email.toUpperCase(), ADMIN.password);
    expect(res.status).toBe(200);
  });

  it('no revela si el email existe (mismo error para email o contraseña incorrectos)', async () => {
    const wrongPassword = await signIn(ADMIN.email, 'contraseña-incorrecta');
    const unknownEmail = await signIn('nadie@pachamama.test', 'contraseña-incorrecta');

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.code).toBe(unknownEmail.body.code);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('bloquea la fuerza bruta: 429 tras 5 intentos por minuto desde la misma IP', async () => {
    const ip = uniqueIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await signIn(ADMIN.email, `mala-${i}`, ip)).status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('rechaza peticiones de un origen no confiable (CSRF)', async () => {
    const res = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Origin', 'https://evil.example')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email: ADMIN.email, password: ADMIN.password });

    expect(res.status).toBe(403);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('rechaza acciones con sesión enviadas desde otro origen (CSRF con cookie)', async () => {
    const cookie = await loginCookie(ADMIN.email, ADMIN.password);
    const res = await request(app)
      .post('/api/auth/sign-out')
      .set('Origin', 'https://evil.example')
      .set('X-Forwarded-For', uniqueIp())
      .set('Cookie', cookie);
    expect(res.status).toBe(403);

    // La sesión sigue viva: el ataque no tuvo efecto.
    const me = await request(app).get('/api/v1/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
  });

  it('bloquea un login por navegación cruzada (Fetch Metadata)', async () => {
    const res = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Sec-Fetch-Site', 'cross-site')
      .set('Sec-Fetch-Mode', 'navigate')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(res.status).toBe(403);
  });

  it('borrar un usuario elimina sus sesiones (cascada)', async () => {
    await loginCookie(STAFF.email, STAFF.password);
    const user = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', STAFF.email)
      .executeTakeFirstOrThrow();

    await db.deleteFrom('users').where('id', '=', user.id).execute();
    const left = await db
      .selectFrom('sessions')
      .select('id')
      .where('userId', '=', user.id)
      .execute();
    expect(left).toEqual([]);
  });

  it.each([
    ["' OR 1=1 --", 'x'],
    ['<script>alert(1)</script>@x.de', 'x'],
    [ADMIN.email, "' OR '1'='1"],
  ])(
    'entradas maliciosas no inician sesión ni rompen el servidor (%s)',
    async (email, password) => {
      const res = await signIn(email, password);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    },
  );

  it('un usuario bloqueado no puede entrar', async () => {
    await db.updateTable('users').set({ banned: true }).where('email', '=', STAFF.email).execute();
    const res = await signIn(STAFF.email, STAFF.password);
    expect(res.status).toBe(403);
  });

  it('cerrar sesión invalida la cookie', async () => {
    const cookie = await loginCookie(ADMIN.email, ADMIN.password);
    const out = await request(app)
      .post('/api/auth/sign-out')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', uniqueIp())
      .set('Cookie', cookie);
    expect(out.status).toBe(200);

    const me = await request(app).get('/api/v1/me').set('Cookie', cookie);
    expect(me.status).toBe(401);
  });
});

describe('permisos de la API', () => {
  it('GET /api/v1/me sin sesión → 401 con formato estándar', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
    });
  });

  it('GET /api/v1/me con sesión devuelve solo datos públicos', async () => {
    const cookie = await loginCookie(STAFF.email, STAFF.password);
    const res = await request(app).get('/api/v1/me').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(staffUserSchema.strict().parse(res.body.data)).toMatchObject({
      email: STAFF.email,
      role: 'staff',
    });
  });

  it('una cookie inventada no da acceso', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Cookie', 'pachamama.session_token=falsa.firma');
    expect(res.status).toBe(401);
  });

  it('staff no puede ver el listado de usuarios (403)', async () => {
    const cookie = await loginCookie(STAFF.email, STAFF.password);
    const res = await request(app).get('/api/v1/admin/users').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('admin ve el listado de usuarios sin contraseñas ni tokens', async () => {
    const cookie = await loginCookie(ADMIN.email, ADMIN.password);
    const res = await request(app).get('/api/v1/admin/users').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    for (const user of res.body.data) staffUserSchema.strict().parse(user);
    expect(JSON.stringify(res.body)).not.toMatch(/password|token/i);
  });

  it('staff no puede usar los endpoints de administración de Better Auth', async () => {
    const cookie = await loginCookie(STAFF.email, STAFF.password);
    const res = await request(app)
      .post('/api/auth/admin/set-role')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', uniqueIp())
      .set('Cookie', cookie)
      .send({ userId: 'cualquiera', role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('las respuestas con datos personales no se guardan en caché (no-store)', async () => {
    const cookie = await loginCookie(STAFF.email, STAFF.password);
    const res = await request(app).get('/api/v1/me').set('Cookie', cookie);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('un usuario bloqueado con la sesión ya abierta pierde el acceso (403)', async () => {
    const cookie = await loginCookie(STAFF.email, STAFF.password);
    await db.updateTable('users').set({ banned: true }).where('email', '=', STAFF.email).execute();

    const res = await request(app).get('/api/v1/me').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('un bloqueo temporal ya vencido no impide el acceso', async () => {
    const cookie = await loginCookie(STAFF.email, STAFF.password);
    await db
      .updateTable('users')
      .set({ banned: true, banExpires: new Date(Date.now() - 60_000) })
      .where('email', '=', STAFF.email)
      .execute();

    const res = await request(app).get('/api/v1/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('un usuario sin rol o con un rol desconocido no entra en rutas de admin', async () => {
    const cookie = await loginCookie(STAFF.email, STAFF.password);
    for (const role of [null, 'superadmin']) {
      await db.updateTable('users').set({ role }).where('email', '=', STAFF.email).execute();
      const res = await request(app).get('/api/v1/admin/users').set('Cookie', cookie);
      expect(res.status).toBe(403);
    }
  });

  it('ni siquiera el admin puede suplantar a otro usuario (permiso retirado)', async () => {
    const cookie = await loginCookie(ADMIN.email, ADMIN.password);
    const staff = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', STAFF.email)
      .executeTakeFirstOrThrow();

    const res = await request(app)
      .post('/api/auth/admin/impersonate-user')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', uniqueIp())
      .set('Cookie', cookie)
      .send({ userId: staff.id });
    expect(res.status).toBe(403);
  });
});

describe('IP del cliente para el límite de intentos', () => {
  it('rotar IPs falsas en X-Forwarded-For no salta el límite', async () => {
    // El salto de confianza (el proxy) siempre añade la IP real al final de la cadena.
    const realIp = uniqueIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/auth/sign-in/email')
        .set('Origin', ORIGIN)
        .set('X-Forwarded-For', `198.51.100.${i + 1}, ${realIp}`)
        .send({ email: ADMIN.email, password: `mala-${i}` });
      statuses.push(res.status);
    }
    expect(statuses[5]).toBe(429);
  });

  it('detrás del proxy, un atacante no bloquea el login de otra persona', async () => {
    // Cadenas como las que deja un nginx que AÑADE la IP real a la cabecera del cliente.
    const attacker = uniqueIp();
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/sign-in/email')
        .set('Origin', ORIGIN)
        .set('X-Forwarded-For', `203.0.113.${i + 1}, ${attacker}`)
        .send({ email: ADMIN.email, password: `mala-${i}` });
    }

    const legit = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', `192.0.2.77, ${uniqueIp()}`)
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(legit.status).toBe(200);
  });
});
