import { toRestaurantLocal, toUtc } from '@pachamama/shared';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { db } from '../../db/database';
import { testMailer } from '../../lib/mail';
import { ADMIN, loginCookie, ORIGIN, seedStaffUsers, STAFF } from '../../test/auth-helpers';
import { resetReservationTables } from '../../test/db-helpers';

const app = createApp();
const BASE = '/api/v1/admin/reservations';
let adminCookie = '';
let staffCookie = '';

const addDays = (date: string, n: number) => {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const DAY = addDays(toRestaurantLocal(new Date()).date, 10);

const get = (path: string, cookie = adminCookie) =>
  request(app).get(`${BASE}${path}`).set('Cookie', cookie);
const patchStatus = (id: number, body: object, cookie = adminCookie) =>
  request(app).patch(`${BASE}/${id}/status`).set('Origin', ORIGIN).set('Cookie', cookie).send(body);
const resend = (id: number, cookie = adminCookie) =>
  request(app).post(`${BASE}/${id}/resend-email`).set('Origin', ORIGIN).set('Cookie', cookie);

type Seed = {
  startsAt: Date;
  partySize: number;
  name: string;
  email: string;
  lang: 'de' | 'es';
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show';
};
async function seed(over: Partial<Seed> = {}) {
  const values: Seed = {
    startsAt: toUtc(DAY, '19:00'),
    partySize: 4,
    name: 'Ana Pérez',
    email: 'ana@example.com',
    lang: 'es',
    status: 'pending',
    ...over,
  };
  const { insertId } = await db
    .insertInto('reservations')
    .values({ publicId: crypto.randomUUID(), phone: '+49 30 1', ...values })
    .executeTakeFirstOrThrow();
  return Number(insertId);
}
const events = (id: number) =>
  db
    .selectFrom('reservationEvents')
    .selectAll()
    .where('reservationId', '=', id)
    .orderBy('id')
    .execute();
const lastEmailFailed = async () =>
  ((await get(`?date=${DAY}`)).body.data as { lastEmailFailed: boolean }[])[0]?.lastEmailFailed;

beforeAll(async () => {
  await seedStaffUsers();
  adminCookie = await loginCookie(app, ADMIN.email, ADMIN.password);
  staffCookie = await loginCookie(app, STAFF.email, STAFF.password);
});
beforeEach(async () => {
  await resetReservationTables();
  testMailer.sent.length = 0;
});

describe('permisos', () => {
  it('sin sesión → 401', async () => {
    const res = await request(app).get(`${BASE}?date=${DAY}`);
    expect(res.status).toBe(401);
  });
  it('staff puede listar y decidir', async () => {
    const id = await seed();
    expect((await get(`?date=${DAY}`, staffCookie)).status).toBe(200);
    expect((await patchStatus(id, { status: 'confirmed' }, staffCookie)).status).toBe(200);
  });
});

describe('GET /', () => {
  it('lists the Berlin day ordered by time, filters by status, flags failed email', async () => {
    const late = await seed({ startsAt: toUtc(DAY, '21:00') });
    const early = await seed({ startsAt: toUtc(DAY, '13:00'), status: 'confirmed' });
    await seed({ startsAt: toUtc(addDays(DAY, 1), '13:00') });
    await db
      .insertInto('reservationEvents')
      .values({
        reservationId: late,
        fromStatus: 'pending',
        toStatus: 'pending',
        emailStatus: 'failed',
      })
      .execute();
    const res = await get(`?date=${DAY}`);
    expect(res.status).toBe(200);
    const data = res.body.data as { id: number; lastEmailFailed: boolean; email: string }[];
    expect(data.map((r) => r.id)).toEqual([early, late]);
    expect(data.map((r) => r.lastEmailFailed)).toEqual([false, true]);
    expect(data[0]).toMatchObject({ email: 'ana@example.com', lang: 'es', status: 'confirmed' });
    const filtered = await get(`?date=${DAY}&status=pending`);
    expect((filtered.body.data as { id: number }[]).map((r) => r.id)).toEqual([late]);
  });
  it.each(['', '?date=2027-02-31', `?date=${DAY}&status=nope`])('%s → 400', async (q) => {
    const res = await get(q);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /pending-count', () => {
  it('counts only future pending reservations', async () => {
    await seed();
    await seed();
    await seed({ status: 'confirmed' });
    await seed({ startsAt: new Date(Date.now() - 3600_000) });
    const res = await get('/pending-count');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ count: 2 });
  });
});

describe('GET /:id', () => {
  it('returns the reservation with events and actor name', async () => {
    const id = await seed();
    await patchStatus(id, { status: 'confirmed' });
    const res = await get(`/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id, status: 'confirmed', name: 'Ana Pérez' });
    const evs = res.body.data.events as { toStatus: string; actorName: string | null }[];
    expect(evs.map((e) => e.toStatus)).toEqual(['confirmed']);
    expect(evs[0]?.actorName).toBe(ADMIN.name);
  });
  it('404 NOT_FOUND', async () => {
    const res = await get('/999999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /:id/message-preview', () => {
  it('renders the template in the customer language', async () => {
    const id = await seed({ lang: 'de' });
    const res = await get(`/${id}/message-preview?status=confirmed`);
    expect(res.status).toBe(200);
    expect(res.body.data.lang).toBe('de');
    expect(res.body.data.body).toContain('Ana Pérez');
    expect(res.body.data.body).not.toContain('{name}');
    expect(res.body.data.subject.length).toBeGreaterThan(0);
  });
  it.each(['pending', 'completed', 'x', ''])('status "%s" → 400', async (s) => {
    const id = await seed();
    expect((await get(`/${id}/message-preview?status=${s}`)).status).toBe(400);
  });
});

async function templateSubject(kind: 'confirmed' | 'rejected', lang: 'de' | 'es') {
  const row = await db
    .selectFrom('reservationMessageTemplates')
    .select('subject')
    .where('kind', '=', kind)
    .where('lang', '=', lang)
    .executeTakeFirstOrThrow();
  return row.subject.replace('{name}', 'Ana Pérez');
}

describe('PATCH /:id/status', () => {
  it('confirm without message → Spanish template mail; event stores the sent text', async () => {
    const id = await seed({ lang: 'es' });
    const res = await patchStatus(id, { status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.data.emailStatus).toBe('sent');
    expect(res.body.data.reservation.status).toBe('confirmed');
    expect(testMailer.sent).toHaveLength(1);
    const mail = testMailer.sent[0];
    expect(mail?.to).toBe('ana@example.com');
    expect(mail?.subject).toBe(await templateSubject('confirmed', 'es'));
    expect(mail?.text).toContain('Ana Pérez');
    expect(mail?.text).not.toContain('{name}');
    const row = await db
      .selectFrom('reservations')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
    expect(row.decidedBy).not.toBeNull();
    expect(row.decidedAt).not.toBeNull();
    const [ev] = await events(id);
    expect(ev).toMatchObject({ fromStatus: 'pending', toStatus: 'confirmed', emailStatus: 'sent' });
    expect(ev?.message).toBeTruthy();
    expect(mail?.text.startsWith(ev?.message ?? '\0')).toBe(true);
  });

  it('German customer gets the German template', async () => {
    const id = await seed({ lang: 'de' });
    await patchStatus(id, { status: 'rejected' });
    expect(testMailer.sent[0]?.subject).toBe(await templateSubject('rejected', 'de'));
  });

  it('edited message and subject are sent as is; variables are not re-rendered', async () => {
    const id = await seed();
    const message = 'Hola {name}\nNos vemos <script>alert(1)</script>';
    const res = await patchStatus(id, { status: 'confirmed', message, subject: 'Mi asunto' });
    expect(res.status).toBe(200);
    const mail = testMailer.sent[0];
    expect(mail?.subject).toBe('Mi asunto');
    expect(mail?.text).toContain(message);
    expect(mail?.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(mail?.html).not.toContain('<script>');
    const [ev] = await events(id);
    expect(ev?.message).toBe(message);
  });

  it('notify=false → no mail, emailStatus skipped, no message stored', async () => {
    const id = await seed();
    const res = await patchStatus(id, { status: 'confirmed', notify: false });
    expect(res.status).toBe(200);
    expect(res.body.data.emailStatus).toBe('skipped');
    expect(testMailer.sent).toHaveLength(0);
    const [ev] = await events(id);
    expect(ev).toMatchObject({ emailStatus: 'skipped', message: null });
  });

  it('completed sends nothing and records a null emailStatus', async () => {
    const id = await seed({ status: 'confirmed' });
    const res = await patchStatus(id, { status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.emailStatus).toBeNull();
    expect(testMailer.sent).toHaveLength(0);
    const [ev] = await events(id);
    expect(ev).toMatchObject({ toStatus: 'completed', emailStatus: null, message: null });
    const row = await db
      .selectFrom('reservations')
      .select('decidedBy')
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
    expect(row.decidedBy).toBeNull();
  });

  it('pending → completed → 409 INVALID_TRANSITION', async () => {
    const id = await seed();
    const res = await patchStatus(id, { status: 'completed' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
    expect(await events(id)).toHaveLength(0);
  });

  it('404 for unknown id', async () => {
    expect((await patchStatus(999999, { status: 'confirmed' })).status).toBe(404);
  });

  it('message over 2000 characters → 400', async () => {
    const id = await seed();
    const res = await patchStatus(id, { status: 'confirmed', message: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('message or subject on a non-decision status → 400', async () => {
    const id = await seed({ status: 'confirmed' });
    expect((await patchStatus(id, { status: 'completed', message: 'hi' })).status).toBe(400);
    expect((await patchStatus(id, { status: 'completed', subject: 'hi' })).status).toBe(400);
  });

  it('SMTP failure → 200, status changed, event failed; resend-email sends it', async () => {
    const id = await seed();
    testMailer.failNext();
    const res = await patchStatus(id, { status: 'confirmed', message: 'Texto del personal' });
    expect(res.status).toBe(200);
    expect(res.body.data.emailStatus).toBe('failed');
    expect(res.body.data.reservation.status).toBe('confirmed');
    expect(testMailer.sent).toHaveLength(0);
    expect((await events(id))[0]?.emailStatus).toBe('failed');
    expect(await lastEmailFailed()).toBe(true);

    const again = await resend(id);
    expect(again.status).toBe(200);
    expect(again.body.data.emailStatus).toBe('sent');
    expect(testMailer.sent).toHaveLength(1);
    expect(testMailer.sent[0]?.text).toContain('Texto del personal');
    const evs = await events(id);
    expect(evs).toHaveLength(2);
    expect(evs[1]).toMatchObject({
      fromStatus: 'confirmed',
      toStatus: 'confirmed',
      emailStatus: 'sent',
      message: null,
    });
    expect(await lastEmailFailed()).toBe(false);
  });
});

describe('POST /:id/resend-email', () => {
  it('409 NOTHING_TO_RESEND when there is no decision message', async () => {
    const id = await seed();
    const res = await resend(id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOTHING_TO_RESEND');
  });
  it('409 when the status moved on after the decision', async () => {
    const id = await seed();
    await patchStatus(id, { status: 'confirmed' });
    await patchStatus(id, { status: 'completed' });
    expect((await resend(id)).body.error.code).toBe('NOTHING_TO_RESEND');
  });
  it('404 for unknown id', async () => {
    expect((await resend(999999)).status).toBe(404);
  });
});

describe('fix round: subject storage, validation, fallbacks', () => {
  it('edited subject and body survive an SMTP failure and are reused by resend', async () => {
    const id = await seed();
    testMailer.failNext();
    await patchStatus(id, {
      status: 'confirmed',
      subject: 'Asunto editado',
      message: 'Cuerpo editado',
    });
    const [ev] = await events(id);
    expect(ev).toMatchObject({
      subject: 'Asunto editado',
      message: 'Cuerpo editado',
      emailStatus: 'failed',
    });
    expect((await resend(id)).body.data.emailStatus).toBe('sent');
    expect(testMailer.sent[0]?.subject).toBe('Asunto editado');
    expect(testMailer.sent[0]?.text).toContain('Cuerpo editado');
  });

  it('resend of an old event without subject falls back to the template subject', async () => {
    const id = await seed({ status: 'confirmed' });
    await db
      .insertInto('reservationEvents')
      .values({
        reservationId: id,
        fromStatus: 'pending',
        toStatus: 'confirmed',
        message: 'Viejo',
        emailStatus: 'failed',
      })
      .execute();
    expect((await resend(id)).status).toBe(200);
    expect(testMailer.sent[0]?.subject).toBe(await templateSubject('confirmed', 'es'));
  });

  it('cancelled is a decision: mail in the customer language', async () => {
    const id = await seed({ lang: 'de', status: 'confirmed' });
    const res = await patchStatus(id, { status: 'cancelled' });
    expect(res.body.data.emailStatus).toBe('sent');
    expect(testMailer.sent).toHaveLength(1);
    const de = await db
      .selectFrom('reservationMessageTemplates')
      .select('subject')
      .where('kind', '=', 'cancelled')
      .where('lang', '=', 'de')
      .executeTakeFirstOrThrow();
    expect(testMailer.sent[0]?.subject).toBe(de.subject.replace('{name}', 'Ana Pérez'));
  });

  it('message without subject → template subject; subject without message → template body', async () => {
    const a = await seed();
    await patchStatus(a, { status: 'confirmed', message: 'Solo texto' });
    expect(testMailer.sent[0]?.subject).toBe(await templateSubject('confirmed', 'es'));
    expect(testMailer.sent[0]?.text).toContain('Solo texto');
    const b = await seed();
    await patchStatus(b, { status: 'confirmed', subject: 'Solo asunto' });
    expect(testMailer.sent[1]?.subject).toBe('Solo asunto');
    expect(testMailer.sent[1]?.text).toContain('Ana Pérez');
  });

  it('message or subject with notify=false → 400', async () => {
    const id = await seed();
    expect(
      (await patchStatus(id, { status: 'confirmed', notify: false, message: 'x' })).status,
    ).toBe(400);
    expect(
      (await patchStatus(id, { status: 'confirmed', notify: false, subject: 'x' })).status,
    ).toBe(400);
  });

  describe('missing template', () => {
    const removeTemplate = () =>
      db
        .deleteFrom('reservationMessageTemplates')
        .where('kind', '=', 'confirmed')
        .where('lang', '=', 'es')
        .execute();
    const saveTemplate = async () =>
      db
        .selectFrom('reservationMessageTemplates')
        .selectAll()
        .where('kind', '=', 'confirmed')
        .where('lang', '=', 'es')
        .executeTakeFirstOrThrow();

    it('subject and message supplied → sent; only message → fixed fallback subject', async () => {
      const saved = await saveTemplate();
      await removeTemplate();
      try {
        const a = await seed();
        expect(
          (await patchStatus(a, { status: 'confirmed', subject: 'S', message: 'M' })).body.data
            .emailStatus,
        ).toBe('sent');
        expect(testMailer.sent[0]?.subject).toBe('S');
        const b = await seed();
        await patchStatus(b, { status: 'confirmed', message: 'M2' });
        expect(testMailer.sent[1]?.subject).toBe('Su reserva en Pachamama');
        const c = await seed();
        const res = await patchStatus(c, { status: 'confirmed' });
        expect(res.body.data.emailStatus).toBe('failed');
      } finally {
        await db.insertInto('reservationMessageTemplates').values(saved).execute();
      }
    });
  });

  it('nothing is mailed on 404 or 409', async () => {
    const id = await seed();
    await patchStatus(999999, { status: 'confirmed' });
    await patchStatus(id, { status: 'completed' });
    await resend(999999);
    await resend(id);
    expect(testMailer.sent).toHaveLength(0);
  });
});
