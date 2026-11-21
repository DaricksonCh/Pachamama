import type { Kysely } from 'kysely';
import type { Database } from '../db/types';

/**
 * Borra datos de autenticación caducados (DSGVO, art. 5.1.e: limitación del plazo).
 * Las sesiones guardan IP y user agent del personal; una vez caducadas no sirven para nada.
 * Se ejecuta a diario con `npm run db:cleanup` (cron en el servidor).
 */
export async function deleteExpiredAuthData(db: Kysely<Database>, now: Date = new Date()) {
  const sessions = await db.deleteFrom('sessions').where('expiresAt', '<', now).executeTakeFirst();
  const verifications = await db
    .deleteFrom('verifications')
    .where('expiresAt', '<', now)
    .executeTakeFirst();

  return {
    sessions: Number(sessions.numDeletedRows),
    verifications: Number(verifications.numDeletedRows),
  };
}
