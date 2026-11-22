import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { db } from '../../db/database';
import { ADMIN, loginCookie, ORIGIN, seedStaffUsers, STAFF } from '../../test/auth-helpers';
import { assertConnectedToTestDatabase } from '../../test/db-helpers';
import { settingsService } from './settings.routes';

const app = createApp();
const BASE = '/api/v1/admin/reservation-settings';
let adminCookie = '';
let staffCookie = '';

const get = (path: string, cookie = adminCookie) =>
  request(app).get(`${BASE}${path}`).set('Cookie', cookie);
const send = (
  method: 'post' | 'patch' | 'put' | 'delete',
  path: string,
  body: object | undefined,
  cookie = adminCookie,
) => {
  const r = request(app)[method](`${BASE}${path}`).set('Origin', ORIGIN).set('Cookie', cookie);
  return body ? r.send(body) : r;
};

type Snapshot = {
  hours: { weekday: number; opens: string; closes: string }[];
  closures: { fromDate: Date; toDate: Date; reasonDe: string | null; reasonEs: string | null }[];
  settings: { slotMinutes: number; hoursConfirmed: boolean } & Record<string, unknown>;
  templates: {
    kind: 'received' | 'confirmed' | 'rejected' | 'cancelled';
    lang: 'de' | 'es';
    subject: string;
    body: string;
  }[];
};
let snapshot: Snapshot;

beforeAll(async () => {
  await seedStaffUsers();
  adminCookie = await loginCookie(app, ADMIN.email, ADMIN.password);
  staffCookie = await loginCookie(app, STAFF.email, STAFF.password);
});

beforeEach(async () => {
  await assertConnectedToTestDatabase();
  snapshot = {
    hours: await db.selectFrom('openingHours').select(['weekday', 'opens', 'closes']).execute(),
    closures: await db
      .selectFrom('closures')
      .select(['fromDate', 'toDate', 'reasonDe', 'reasonEs'])
      .execute(),
    settings: await db.selectFrom('reservationSettings').selectAll().executeTakeFirstOrThrow(),
    templates: await db.selectFrom('reservationMessageTemplates').selectAll().execute(),
  };
  settingsService.invalidate();
});

/** Restores the seeded config so other test files stay deterministic. */
afterEach(async () => {
  await db.deleteFrom('openingHours').execute();
  if (snapshot.hours.length) await db.insertInto('openingHours').values(snapshot.hours).execute();
  await db.deleteFrom('closures').execute();
  if (snapshot.closures.length) await db.insertInto('closures').values(snapshot.closures).execute();
  await db.updateTable('reservationSettings').set(snapshot.settings).where('id', '=', 1).execute();
  await db.deleteFrom('reservationMessageTemplates').execute();
  await db.insertInto('reservationMessageTemplates').values(snapshot.templates).execute();
  settingsService.invalidate();
});

describe('permisos', () => {
  it('sin sesión → 401', async () => {
    expect((await request(app).get(`${BASE}/hours`)).status).toBe(401);
  });
  it('staff lee (200) pero no escribe (403)', async () => {
    expect((await get('/hours', staffCookie)).status).toBe(200);
    expect((await get('/settings', staffCookie)).status).toBe(200);
    expect((await send('put', '/hours', { hours: [] }, staffCookie)).status).toBe(403);
    expect((await send('post', '/closures', {}, staffCookie)).status).toBe(403);
    expect((await send('patch', '/settings', {}, staffCookie)).status).toBe(403);
  });
});

describe('horario', () => {
  it('GET devuelve la semilla y hoursConfirmed', async () => {
    const res = await get('/hours');
    expect(res.status).toBe(200);
    expect(res.body.data.hours).toHaveLength(6);
    expect(res.body.data.hours[0]).toEqual({ weekday: 0, opens: '13:00', closes: '22:00' });
    expect(res.body.data.hoursConfirmed).toBe(snapshot.settings.hoursConfirmed);
  });

  it('PUT reemplaza la semana, marca hoursConfirmed y refresca el contexto', async () => {
    await settingsService.getBookingContext(); // calienta la caché
    const hours = [
      { weekday: 1, opens: '12:00', closes: '15:00' },
      { weekday: 1, opens: '18:00', closes: '22:30' },
    ];
    const res = await send('put', '/hours', { hours });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ hours, hoursConfirmed: true });
    const ctx = await settingsService.getBookingContext();
    expect(ctx.hours).toEqual(hours);
  });

  it('solape → 400 VALIDATION_ERROR y no cambia nada', async () => {
    const res = await send('put', '/hours', {
      hours: [
        { weekday: 1, opens: '12:00', closes: '16:00' },
        { weekday: 1, opens: '15:00', closes: '20:00' },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect((await get('/hours')).body.data.hours).toHaveLength(6);
  });
});

describe('cierres', () => {
  it('crea, lista solo los futuros ordenados y borra', async () => {
    const past = await send('post', '/closures', { from: '2020-01-01', to: '2020-01-05' });
    expect(past.status).toBe(201);
    const b = await send('post', '/closures', {
      from: '2099-08-01',
      to: '2099-08-10',
      reasonDe: 'Urlaub',
    });
    const a = await send('post', '/closures', {
      from: '2099-03-01',
      to: '2099-03-01',
      reasonEs: 'Obras',
    });
    expect(b.body.data).toMatchObject({ from: '2099-08-01', to: '2099-08-10', reasonDe: 'Urlaub' });

    const list = await get('/closures');
    expect(list.status).toBe(200);
    expect(list.body.data.map((c: { id: number }) => c.id)).toEqual([
      a.body.data.id,
      b.body.data.id,
    ]);
    expect((await settingsService.getBookingContext()).closures).toHaveLength(2);

    expect((await send('delete', `/closures/${a.body.data.id}`, undefined)).status).toBe(204);
    const again = await send('delete', `/closures/${a.body.data.id}`, undefined);
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('NOT_FOUND');
    expect((await settingsService.getBookingContext()).closures).toHaveLength(1);
  });

  it('from > to → 400', async () => {
    const res = await send('post', '/closures', { from: '2099-05-10', to: '2099-05-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('ajustes', () => {
  it('PATCH parcial se fusiona y persiste', async () => {
    const res = await send('patch', '/settings', { capacityPerSlot: 45, sameDayOnline: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ capacityPerSlot: 45, sameDayOnline: true, partyMax: 10 });
    expect((await get('/settings')).body.data.capacityPerSlot).toBe(45);
    expect((await settingsService.getBookingContext()).settings.capacityPerSlot).toBe(45);
  });
  it('partyMin > partyMax tras fusionar → 400', async () => {
    const res = await send('patch', '/settings', { partyMin: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('plantillas', () => {
  it('GET devuelve las 8', async () => {
    const res = await get('/templates');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(8);
  });
  it('PUT actualiza una plantilla', async () => {
    const res = await send('put', '/templates/confirmed/es', {
      subject: 'Hola',
      body: 'Cuerpo {name}',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      kind: 'confirmed',
      lang: 'es',
      subject: 'Hola',
      body: 'Cuerpo {name}',
    });
    const all = (await get('/templates')).body.data as {
      kind: string;
      lang: string;
      subject: string;
    }[];
    expect(all.find((t) => t.kind === 'confirmed' && t.lang === 'es')?.subject).toBe('Hola');
  });
  it('body > 4000 → 400; kind o lang desconocidos → 400', async () => {
    const long = await send('put', '/templates/received/de', {
      subject: 's',
      body: 'x'.repeat(4001),
    });
    expect(long.status).toBe(400);
    expect(long.body.error.code).toBe('VALIDATION_ERROR');
    expect((await send('put', '/templates/nope/de', { subject: 's', body: 'b' })).status).toBe(400);
    expect((await send('put', '/templates/received/fr', { subject: 's', body: 'b' })).status).toBe(
      400,
    );
  });
});
