/**
 * Limpieza diaria de datos caducados (sesiones y verificaciones).
 *   npm run db:cleanup
 * En producción se programa con cron (ver docs/security-privacy.md).
 */
import { deleteExpiredAuthData } from '../src/auth/cleanup';
import { env } from '../src/config/env';
import { db } from '../src/db/database';
import { anonymizePastReservations } from '../src/modules/reservations/retention';

try {
  const deleted = await deleteExpiredAuthData(db);
  console.log(
    `✔ Borradas ${deleted.sessions} sesiones y ${deleted.verifications} verificaciones caducadas`,
  );
  const anonymized = await anonymizePastReservations(
    db,
    new Date(),
    env.RESERVATIONS_RETENTION_DAYS,
  );
  console.log(
    `✔ Anonimizadas ${anonymized} reservas de más de ${env.RESERVATIONS_RETENTION_DAYS} días`,
  );
} catch (err) {
  console.error('✖', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
