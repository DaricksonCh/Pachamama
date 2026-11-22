import type { Kysely } from 'kysely';
import type { Database } from '../../db/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * DSGVO (art. 5.1.e): anonymizes reservations whose date passed more than `retentionDays` ago.
 * Personal data (name, email, phone, comment) and the free-text of the history are removed;
 * status, date and party size stay for statistics. Returns how many reservations were anonymized.
 * Run daily by `npm run db:cleanup`.
 */
export async function anonymizePastReservations(
  db: Kysely<Database>,
  now: Date,
  retentionDays: number,
): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);

  return db.transaction().execute(async (trx) => {
    const rows = await trx
      .selectFrom('reservations')
      .select('id')
      .where('startsAt', '<', cutoff)
      .where('anonymizedAt', 'is', null)
      .forUpdate()
      .execute();
    if (rows.length === 0) return 0;
    const ids = rows.map((row) => row.id);

    await trx
      .updateTable('reservations')
      .set({ name: '—', email: '', phone: '', comment: null, anonymizedAt: now })
      .where('id', 'in', ids)
      .execute();
    await trx
      .updateTable('reservationEvents')
      .set({ message: null, subject: null })
      .where('reservationId', 'in', ids)
      .execute();

    return ids.length;
  });
}
