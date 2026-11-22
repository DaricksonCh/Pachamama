import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/database';
import { assertConnectedToTestDatabase, resetReservationTables } from '../../test/db-helpers';
import { anonymizePastReservations } from './retention';

const NOW = new Date('2026-12-01T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);

async function insertReservation(startsAt: Date, anonymizedAt: Date | null = null) {
  const result = await db
    .insertInto('reservations')
    .values({
      publicId: crypto.randomUUID(),
      startsAt,
      partySize: 4,
      name: 'Ana Test',
      email: 'ana@test.invalid',
      phone: '+49 421 000000',
      comment: 'Window seat',
      lang: 'es',
      status: 'completed',
      anonymizedAt,
    })
    .executeTakeFirstOrThrow();
  const id = Number(result.insertId);
  await db
    .insertInto('reservationEvents')
    .values({
      reservationId: id,
      fromStatus: 'pending',
      toStatus: 'completed',
      message: 'Personal text',
      subject: 'Personal subject',
    })
    .execute();
  return id;
}

const load = (id: number) =>
  db.selectFrom('reservations').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
const loadEvent = (id: number) =>
  db
    .selectFrom('reservationEvents')
    .selectAll()
    .where('reservationId', '=', id)
    .executeTakeFirstOrThrow();

beforeAll(async () => {
  await assertConnectedToTestDatabase();
});
beforeEach(resetReservationTables);
afterEach(resetReservationTables);

describe('anonymizePastReservations', () => {
  it('anonymizes reservations older than the retention period and clears event texts', async () => {
    const id = await insertReservation(daysAgo(91));

    expect(await anonymizePastReservations(db, NOW, 90)).toBe(1);

    const row = await load(id);
    expect(row).toMatchObject({ name: '—', email: '', phone: '', comment: null });
    expect(row.anonymizedAt).toEqual(NOW);
    expect(row.status).toBe('completed');
    expect(row.partySize).toBe(4);
    expect(row.startsAt).toEqual(daysAgo(91));
    const event = await loadEvent(id);
    expect(event.message).toBeNull();
    expect(event.subject).toBeNull();
    expect(event.toStatus).toBe('completed');
  });

  it('leaves recent reservations untouched', async () => {
    const id = await insertReservation(daysAgo(89));

    expect(await anonymizePastReservations(db, NOW, 90)).toBe(0);

    const row = await load(id);
    expect(row).toMatchObject({ name: 'Ana Test', email: 'ana@test.invalid', anonymizedAt: null });
    expect((await loadEvent(id)).message).toBe('Personal text');
  });

  it('does not count already anonymized reservations again', async () => {
    const earlier = daysAgo(10);
    const id = await insertReservation(daysAgo(120), earlier);

    expect(await anonymizePastReservations(db, NOW, 90)).toBe(0);
    expect((await load(id)).anonymizedAt).toEqual(earlier);
  });

  it('returns the number of anonymized reservations', async () => {
    await insertReservation(daysAgo(100));
    await insertReservation(daysAgo(200));
    await insertReservation(daysAgo(5));

    expect(await anonymizePastReservations(db, NOW, 90)).toBe(2);
    expect(await anonymizePastReservations(db, NOW, 90)).toBe(0);
  });
});
