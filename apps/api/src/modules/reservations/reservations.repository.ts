import {
  CAPACITY_STATUSES,
  DECISION_STATUSES,
  type Language,
  type MessageTemplateKind,
  type ReservationStatus,
} from '@pachamama/shared';
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

export type NewEvent = {
  reservationId: number;
  fromStatus: ReservationStatus;
  toStatus: ReservationStatus;
  actorId: string;
  message: string | null;
  subject: string | null;
  emailStatus: EmailStatus | null;
};

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

    /** Row lock for a status change; null if the reservation does not exist. */
    async lockById(id: number) {
      return trx
        .selectFrom('reservations')
        .selectAll()
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst();
    },

    async getTemplate(kind: MessageTemplateKind, lang: Language) {
      return trx
        .selectFrom('reservationMessageTemplates')
        .select(['subject', 'body'])
        .where('kind', '=', kind)
        .where('lang', '=', lang)
        .executeTakeFirst();
    },

    /** Newest event that moved to a decision status and carries a message. */
    async latestDecisionEvent(reservationId: number) {
      return trx
        .selectFrom('reservationEvents')
        .select(['toStatus', 'message', 'subject'])
        .where('reservationId', '=', reservationId)
        .where('toStatus', 'in', [...DECISION_STATUSES])
        .where('message', 'is not', null)
        .orderBy('id', 'desc')
        .limit(1)
        .executeTakeFirst();
    },

    async applyStatus(id: number, status: ReservationStatus, decidedBy: string | null) {
      await trx
        .updateTable('reservations')
        .set({ status, ...(decidedBy ? { decidedBy, decidedAt: new Date() } : {}) })
        .where('id', '=', id)
        .execute();
    },

    async insertEvent(e: NewEvent): Promise<number> {
      const { insertId } = await trx
        .insertInto('reservationEvents')
        .values(e)
        .executeTakeFirstOrThrow();
      return Number(insertId);
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

    async listByStartRange(from: Date, to: Date, status?: ReservationStatus) {
      let q = db
        .selectFrom('reservations')
        .selectAll()
        .where('startsAt', '>=', from)
        .where('startsAt', '<', to);
      if (status) q = q.where('status', '=', status);
      return q.orderBy('startsAt').orderBy('id').execute();
    },

    /** Ids (of the given reservations) whose latest recorded email attempt failed. */
    async idsWithFailedLastEmail(ids: number[]): Promise<Set<number>> {
      if (ids.length === 0) return new Set();
      const rows = await db
        .selectFrom('reservationEvents')
        .select(['reservationId', 'emailStatus', 'id'])
        .where('reservationId', 'in', ids)
        .where('emailStatus', 'is not', null)
        .orderBy('id', 'desc')
        .execute();
      const seen = new Set<number>();
      const failed = new Set<number>();
      for (const r of rows) {
        if (seen.has(r.reservationId)) continue;
        seen.add(r.reservationId);
        if (r.emailStatus === 'failed') failed.add(r.reservationId);
      }
      return failed;
    },

    async countPendingFrom(from: Date): Promise<number> {
      const row = await db
        .selectFrom('reservations')
        .select((eb) => eb.fn.countAll<string | number>().as('n'))
        .where('status', '=', 'pending')
        .where('startsAt', '>=', from)
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },

    async getById(id: number) {
      return db.selectFrom('reservations').selectAll().where('id', '=', id).executeTakeFirst();
    },

    async eventsFor(reservationId: number) {
      return db
        .selectFrom('reservationEvents as e')
        .leftJoin('users as u', 'u.id', 'e.actorId')
        .select([
          'e.id',
          'e.fromStatus',
          'e.toStatus',
          'u.name as actorName',
          'e.message',
          'e.emailStatus',
          'e.createdAt',
        ])
        .where('e.reservationId', '=', reservationId)
        .orderBy('e.createdAt')
        .orderBy('e.id')
        .execute();
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

    async getTemplate(kind: MessageTemplateKind, lang: Language) {
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
