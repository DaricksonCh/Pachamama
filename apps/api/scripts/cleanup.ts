/**
 * Limpieza diaria de datos caducados (sesiones y verificaciones).
 *   npm run db:cleanup
 * En producción se programa con cron (ver docs/security-privacy.md).
 */
import { deleteExpiredAuthData } from '../src/auth/cleanup';
import { db } from '../src/db/database';

try {
  const deleted = await deleteExpiredAuthData(db);
  console.log(
    `✔ Borradas ${deleted.sessions} sesiones y ${deleted.verifications} verificaciones caducadas`,
  );
} catch (err) {
  console.error('✖', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
