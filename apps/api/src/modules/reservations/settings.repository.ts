import type { Closure, OpeningHours, ReservationSettings } from '@pachamama/shared';
import type { Kysely } from 'kysely';
import type { Database, ReservationLang, ReservationMessageKind } from '../../db/types';

export type StoredClosure = Closure & { id: number };
export type MessageTemplate = {
  kind: ReservationMessageKind;
  lang: ReservationLang;
  subject: string;
  body: string;
};

/** mysql2 returns TIME as "HH:MM:SS"; the domain uses "HH:mm". */
const toHm = (time: string) => time.slice(0, 5);
const toTime = (hm: string) => `${hm}:00`;
/** DATE comes back as a Date at UTC midnight. */
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function toClosure(r: {
  id: number;
  fromDate: Date;
  toDate: Date;
  reasonDe: string | null;
  reasonEs: string | null;
}): StoredClosure {
  return {
    id: r.id,
    from: toIso(r.fromDate),
    to: toIso(r.toDate),
    ...(r.reasonDe ? { reasonDe: r.reasonDe } : {}),
    ...(r.reasonEs ? { reasonEs: r.reasonEs } : {}),
  };
}

/** Acceso a datos de la configuración de reservas. Solo SQL. */
export function createSettingsRepository(db: Kysely<Database>) {
  return {
    async getHours(): Promise<OpeningHours> {
      const rows = await db
        .selectFrom('openingHours')
        .select(['weekday', 'opens', 'closes'])
        .orderBy('weekday')
        .orderBy('opens')
        .execute();
      return rows.map((r) => ({
        weekday: r.weekday,
        opens: toHm(r.opens),
        closes: toHm(r.closes),
      }));
    },

    /** Replaces the whole week and flags the hours as confirmed, atomically. */
    async replaceHours(hours: OpeningHours): Promise<void> {
      await db.transaction().execute(async (trx) => {
        await trx.deleteFrom('openingHours').execute();
        if (hours.length > 0) {
          await trx
            .insertInto('openingHours')
            .values(
              hours.map((h) => ({
                weekday: h.weekday,
                opens: toTime(h.opens),
                closes: toTime(h.closes),
              })),
            )
            .execute();
        }
        await trx
          .updateTable('reservationSettings')
          .set({ hoursConfirmed: true })
          .where('id', '=', 1)
          .execute();
      });
    },

    async getHoursConfirmed(): Promise<boolean> {
      const row = await db
        .selectFrom('reservationSettings')
        .select('hoursConfirmed')
        .where('id', '=', 1)
        .executeTakeFirstOrThrow();
      return Boolean(row.hoursConfirmed);
    },

    /** Closures whose last day is on or after `today` (YYYY-MM-DD), by start date. */
    async listClosuresFrom(today: string): Promise<StoredClosure[]> {
      const rows = await db
        .selectFrom('closures')
        .selectAll()
        .where('toDate', '>=', toDate(today))
        .orderBy('fromDate')
        .orderBy('id')
        .execute();
      return rows.map(toClosure);
    },

    async createClosure(c: Closure): Promise<StoredClosure> {
      const { insertId } = await db
        .insertInto('closures')
        .values({
          fromDate: toDate(c.from),
          toDate: toDate(c.to),
          reasonDe: c.reasonDe ?? null,
          reasonEs: c.reasonEs ?? null,
        })
        .executeTakeFirstOrThrow();
      const row = await db
        .selectFrom('closures')
        .selectAll()
        .where('id', '=', Number(insertId))
        .executeTakeFirstOrThrow();
      return toClosure(row);
    },

    async deleteClosure(id: number): Promise<boolean> {
      const res = await db.deleteFrom('closures').where('id', '=', id).executeTakeFirst();
      return Number(res.numDeletedRows) > 0;
    },

    async getSettings(): Promise<ReservationSettings> {
      const r = await db
        .selectFrom('reservationSettings')
        .selectAll()
        .where('id', '=', 1)
        .executeTakeFirstOrThrow();
      return {
        slotMinutes: r.slotMinutes as 30,
        lastSlotBeforeCloseMinutes: r.lastSlotBeforeCloseMinutes,
        partyMin: r.partyMin,
        partyMax: r.partyMax,
        capacityPerSlot: r.capacityPerSlot,
        minLeadMinutes: r.minLeadMinutes,
        maxAdvanceDays: r.maxAdvanceDays,
        sameDayOnline: Boolean(r.sameDayOnline),
      };
    },

    async updateSettings(s: ReservationSettings): Promise<void> {
      await db.updateTable('reservationSettings').set(s).where('id', '=', 1).execute();
    },

    listTemplates(): Promise<MessageTemplate[]> {
      return db
        .selectFrom('reservationMessageTemplates')
        .select(['kind', 'lang', 'subject', 'body'])
        .orderBy('kind')
        .orderBy('lang')
        .execute();
    },

    async saveTemplate(t: MessageTemplate): Promise<void> {
      await db
        .updateTable('reservationMessageTemplates')
        .set({ subject: t.subject, body: t.body })
        .where('kind', '=', t.kind)
        .where('lang', '=', t.lang)
        .execute();
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
