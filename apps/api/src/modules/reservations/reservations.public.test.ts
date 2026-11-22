import { toRestaurantLocal, toUtc } from '@pachamama/shared';
import { inspect } from 'node:util';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app';
import { db } from '../../db/database';
import { logger } from '../../lib/logger';
import { testMailer } from '../../lib/mail';
import { ORIGIN } from '../../test/auth-helpers';
import {
  assertConnectedToTestDatabase,
  resetReservationTables,
  uniqueIp,
} from '../../test/db-helpers';
import { settingsService } from './settings.routes';

const app = createApp();
const BASE = '/api/v1/reservations';

const addDays = (date: string, n: number) => {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** First date 7+ days ahead whose availability endpoint reports at least one free slot. */
async function openDate() {
  const start = addDays(toRestaurantLocal(new Date()).date, 7);
  for (let i = 0; i < 30; i++) {
    const date = addDays(start, i);
    const res = await request(app).get(`${BASE}/availability?date=${date}&party=2`);
    const slots = (res.body.data?.slots ?? []) as { available: boolean }[];
    if (slots.some((s) => s.available)) return date;
  }
  throw new Error('No open date found for tests');
}
const DATE = await openDate();
const SLOT = '19:00';

const body = (over: Record<string, unknown> = {}) => ({
  partySize: 4,
  date: DATE,
  time: SLOT,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+49 30 1234567',
  comment: 'Ventana, por favor',
  lang: 'es',
  privacyAccepted: true,
  website: '',
  ...over,
});
const post = (payload: object, ip = uniqueIp()) =>
  request(app).post(BASE).set('Origin', ORIGIN).set('X-Forwarded-For', ip).send(payload);
const get = (query: string) => request(app).get(`${BASE}/availability?${query}`);

const readSettings = () =>
  db.selectFrom('reservationSettings').selectAll().executeTakeFirstOrThrow();
let saved: Awaited<ReturnType<typeof readSettings>>;

beforeEach(async () => {
  await assertConnectedToTestDatabase();
  saved = await readSettings();
  await resetReservationTables();
  testMailer.sent.length = 0;
  settingsService.invalidate();
});
afterEach(async () => {
  await db.updateTable('reservationSettings').set(saved).where('id', '=', 1).execute();
  await resetReservationTables();
  settingsService.invalidate();
});

async function seedBooked(partySize: number, time = SLOT) {
  await db
    .insertInto('reservations')
    .values({
      publicId: crypto.randomUUID(),
      startsAt: toUtc(DATE, time),
      partySize,
      name: 'Existing Guest',
      email: 'guest@example.com',
      phone: '123456789',
      lang: 'de',
      status: 'confirmed',
    })
    .execute();
}

type SlotJson = { time: string; available: boolean };

describe('GET /availability', () => {
  it('month → days with slots (Monday excluded), plus limits', async () => {
    const res = await get(`month=${DATE.slice(0, 7)}`);
    expect(res.status).toBe(200);
    const { days, partyMin, partyMax, sameDayOnline } = res.body.data;
    expect(days).toContain(DATE);
    for (const d of days as string[]) {
      expect(new Date(`${d}T00:00:00Z`).getUTCDay()).not.toBe(1);
    }
    expect([partyMin, partyMax, sameDayOnline]).toEqual([1, 10, false]);
  });

  it('date+party → slots with capacity applied', async () => {
    await seedBooked(28);
    const res = await get(`date=${DATE}&party=4`);
    expect(res.status).toBe(200);
    const slots = res.body.data.slots as SlotJson[];
    expect(slots[0]?.time).toBe('13:00');
    expect(slots.at(-1)?.time).toBe('21:00');
    expect(slots.find((s) => s.time === SLOT)?.available).toBe(false);
    expect(slots.find((s) => s.time === '19:30')?.available).toBe(true);
    // Fewer seats needed → the same slot still fits.
    const small = await get(`date=${DATE}&party=2`);
    expect((small.body.data.slots as SlotJson[]).find((s) => s.time === SLOT)?.available).toBe(
      true,
    );
  });

  it.each([
    ['party above partyMax', 'date=DATE&party=11'],
    ['party below partyMin', 'date=DATE&party=0'],
    ['party not an integer', 'date=DATE&party=abc'],
    ['month and date together', 'month=2027-01&date=DATE&party=2'],
    ['nothing', ''],
    ['date without party', 'date=DATE'],
    ['bad month', 'month=2027-13'],
    ['bad date', 'date=2027-02-31&party=2'],
  ])('%s → 400 VALIDATION_ERROR', async (_label, query) => {
    const res = await get(query.replaceAll('DATE', DATE));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /reservations', () => {
  it('valid request → 201, pending row, event, customer + staff emails', async () => {
    const res = await post(body());
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      publicId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      startsAt: toUtc(DATE, SLOT).toISOString(),
      partySize: 4,
      status: 'pending',
    });
    const rows = await db.selectFrom('reservations').selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'pending', email: 'ana@example.com', lang: 'es' });
    const events = await db.selectFrom('reservationEvents').selectAll().execute();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      fromStatus: null,
      toStatus: 'pending',
      actorId: null,
      emailStatus: 'sent',
    });
    expect(testMailer.sent).toHaveLength(2);
    const customer = testMailer.sent.find((m) => m.to === 'ana@example.com');
    const staff = testMailer.sent.find((m) => m.to !== 'ana@example.com');
    expect(customer?.text).toContain('Ana Pérez');
    expect(customer?.text).not.toMatch(/\{(name|date|time|party)\}/);
    expect(staff?.subject).toContain('Neue Reservierungsanfrage');
  });

  it('response carries no personal data', async () => {
    const res = await post(body());
    const raw = JSON.stringify(res.body);
    for (const secret of ['ana@example.com', '1234567', 'Ana', 'Ventana']) {
      expect(raw).not.toContain(secret);
    }
    expect(Object.keys(res.body.data).sort()).toEqual([
      'partySize',
      'publicId',
      'startsAt',
      'status',
    ]);
  });

  it('mail failure keeps the reservation and records emailStatus failed', async () => {
    testMailer.failNext();
    const res = await post(body());
    expect(res.status).toBe(201);
    expect(await db.selectFrom('reservations').selectAll().execute()).toHaveLength(1);
    const event = await db.selectFrom('reservationEvents').selectAll().executeTakeFirstOrThrow();
    expect(event.emailStatus).toBe('failed');
    expect(testMailer.sent).toHaveLength(1); // the staff notice still goes out
  });

  it('mail failure logs never include personal data (DSGVO)', async () => {
    const spies = (['warn', 'error', 'info'] as const).map((l) => vi.spyOn(logger, l));
    testMailer.failNext(new Error('Recipient address rejected: <ana@example.com>'));
    const res = await post(body());
    expect(res.status).toBe(201);
    // Only the service's own log calls (pino-http request logs are serialized elsewhere).
    const calls = spies
      .flatMap((s) => s.mock.calls)
      .filter(([obj]) => typeof obj === 'object' && obj !== null && 'reservationId' in obj);
    expect(calls.length).toBeGreaterThan(0);
    expect(inspect(calls, { depth: 8 })).not.toContain('ana@example.com');
    expect(inspect(calls, { depth: 8 })).not.toContain('Ana');
    spies.forEach((s) => s.mockRestore());
  });

  it('honeypot filled → fake 201, nothing saved, nothing sent', async () => {
    const res = await post(body({ website: 'https://spam.example' }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ partySize: 4, status: 'pending' });
    expect(res.body.data.publicId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await db.selectFrom('reservations').selectAll().execute()).toHaveLength(0);
    expect(await db.selectFrom('reservationEvents').selectAll().execute()).toHaveLength(0);
    expect(testMailer.sent).toHaveLength(0);
  });

  it('partySize outside partyMin..partyMax → 400 with details.partySize', async () => {
    const res = await post(body({ partySize: 11 }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.partySize).toBeDefined();
  });

  it('invalid payload (no privacy consent) → 400', async () => {
    const res = await post(body({ privacyAccepted: false }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.privacyAccepted).toBeDefined();
  });

  it('same-day request → 400 SLOT_UNAVAILABLE (sameDayOnline off)', async () => {
    const res = await post(body({ date: toRestaurantLocal(new Date()).date }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
  });

  it('time outside the slot grid / closed day → 400 SLOT_UNAVAILABLE', async () => {
    expect((await post(body({ time: '10:00' }))).body.error.code).toBe('SLOT_UNAVAILABLE');
    expect((await post(body({ time: '21:30' }))).body.error.code).toBe('SLOT_UNAVAILABLE');
    let monday = DATE;
    while (new Date(`${monday}T00:00:00Z`).getUTCDay() !== 1) monday = addDays(monday, 1);
    expect((await post(body({ date: monday }))).body.error.code).toBe('SLOT_UNAVAILABLE');
    expect(await db.selectFrom('reservations').selectAll().execute()).toHaveLength(0);
  });

  it('slot without capacity → 409 SLOT_FULL, nothing saved', async () => {
    await seedBooked(28);
    const res = await post(body({ partySize: 3 }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_FULL');
    expect(await db.selectFrom('reservations').selectAll().execute()).toHaveLength(1);
    expect(testMailer.sent).toHaveLength(0);
  });

  it('two simultaneous requests for the last 3 seats → one 201, one 409', async () => {
    await db.updateTable('reservationSettings').set({ capacityPerSlot: 10 }).execute();
    settingsService.invalidate();
    await seedBooked(7);
    const [a, b] = await Promise.all([
      post(body({ partySize: 3, email: 'a@example.com' })),
      post(body({ partySize: 3, email: 'b@example.com' })),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const rows = await db.selectFrom('reservations').select('partySize').execute();
    expect(rows.reduce((n, r) => n + r.partySize, 0)).toBe(10);
  });

  it('6th request from the same IP within the window → 429', async () => {
    const ip = uniqueIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      // Invalid payloads still count against the limiter.
      statuses.push((await post(body({ privacyAccepted: false }), ip)).status);
    }
    expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
    expect(statuses[5]).toBe(429);
  });
});
