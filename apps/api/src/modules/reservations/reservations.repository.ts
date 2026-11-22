import { CAPACITY_STATUSES, type Language } from '@pachamama/shared';
import { type Kysely, type Transaction } from 'kysely';
import type { Database } from '../../db/types';

export type NewReservation = {
  publicId: string;
  startsAt: Date;
  partySize: number;
  name: string;
  email: string;
  phone: string;
  comment: string | null;
  lang: Language;
};

export type EmailStatus = 'sent' | 'failed' | 'skipped';

/** Operations that run inside one transaction (see `transaction`). */
export function createReservationTx(trx: Transaction<Database>) {
  return {
    /** Serializes all bookings: every booking transaction takes this row lock first. Returns the capacity. */
    async lockSettings(): Promise<number> {
      const row = await trx
        .selectFrom('reservationSettings')
        .select('capacityPerSlot')
        .where('id', '=', 1)
        .forUpdate()
        .executeTakeFirstOrThrow();
      return row.capacityPerSlot;
    },

    async bookedSeats(startsAt: Date): Promise<number> {
      const row = await trx
        .selectFrom('reservations')
        .select((eb) => eb.fn.sum<string | number | null>('partySize').as('seats'))
        .where('startsAt', '=', startsAt)
        .where('status', 'in', [...CAPACITY_STATUSES])
        .executeTakeFirst();
      return Number(row?.seats ?? 0);
    },

    /** Inserts the pending reservation and its first history event; returns both ids. */
    async insertPending(r: NewReservation): Promise<{ id: number; eventId: number }> {
      const { insertId } = await trx
        .insertInto('reservations')
        .values({ ...r, status: 'pending' })
        .executeTakeFirstOrThrow();
      const id = Number(insertId);
      const event = await trx
        .insertInto('reservationEvents')
        .values({ reservationId: id, fromStatus: null, toStatus: 'pending', actorId: null })
        .executeTakeFirstOrThrow();
      return { id, eventId: Number(event.insertId) };
    },
  };
}
export type ReservationTx = ReturnType<typeof createReservationTx>;

/** Acceso a datos de las reservas. Solo SQL. */
export function createReservationsRepository(db: Kysely<Database>) {
  return {
    /** Seats held by pending/confirmed reservations starting in [from, to), by ISO UTC start. */
    async bookedByStart(from: Date, to: Date): Promise<Map<string, number>> {
      const rows = await db
        .selectFrom('reservations')
        .select(['startsAt', (eb) => eb.fn.sum<string | number>('partySize').as('seats')])
        .where('startsAt', '>=', from)
        .where('startsAt', '<', to)
        .where('status', 'in', [...CAPACITY_STATUSES])
        .groupBy('startsAt')
        .execute();
      return new Map(rows.map((r) => [r.startsAt.toISOString(), Number(r.seats)]));
    },

    transaction<T>(fn: (tx: ReservationTx) => Promise<T>): Promise<T> {
      return db.transaction().execute((trx) => fn(createReservationTx(trx)));
    },

    async setEventEmailStatus(eventId: number, status: EmailStatus): Promise<void> {
      await db
        .updateTable('reservationEvents')
        .set({ emailStatus: status })
        .where('id', '=', eventId)
        .execute();
    },

    async getTemplate(kind: 'received', lang: Language) {
      return db
        .selectFrom('reservationMessageTemplates')
        .select(['subject', 'body'])
        .where('kind', '=', kind)
        .where('lang', '=', lang)
        .executeTakeFirst();
    },
  };
}
export type ReservationsRepository = ReturnType<typeof createReservationsRepository>;
