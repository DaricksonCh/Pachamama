/**
 * Limpieza diaria de datos caducados (sesiones, verificaciones y reservas antiguas).
 *   npm run db:cleanup
 * En producción se programa con cron (ver docs/security-privacy.md).
 * Cada tarea es independiente: si una falla, la otra se ejecuta igualmente y el código de salida es 1.
 * Solo se imprime el nombre del error (los mensajes de mysql2 pueden incluir valores).
 */
import { deleteExpiredAuthData } from '../src/auth/cleanup';
import { env } from '../src/config/env';
import { db } from '../src/db/database';
import { anonymizePastReservations } from '../src/modules/reservations/retention';

const errorLabel = (err: unknown) => {
  if (err && typeof err === 'object') {
    const { code, name } = err as { code?: unknown; name?: unknown };
    if (typeof code === 'string') return code;
    if (typeof name === 'string') return name;
  }
  return 'UnknownError';
};

async function runJob(label: string, job: () => Promise<string>) {
  try {
    console.log(`✔ ${await job()}`);
  } catch (err) {
    console.error(`✖ ${label}: ${errorLabel(err)}`);
    process.exitCode = 1;
  }
}

try {
  await runJob('Limpieza de sesiones', async () => {
    const deleted = await deleteExpiredAuthData(db);
    return `Borradas ${deleted.sessions} sesiones y ${deleted.verifications} verificaciones caducadas`;
  });
  await runJob('Anonimización de reservas', async () => {
    const anonymized = await anonymizePastReservations(
      db,
      new Date(),
      env.RESERVATIONS_RETENTION_DAYS,
    );
    return `Anonimizadas ${anonymized} reservas de más de ${env.RESERVATIONS_RETENTION_DAYS} días`;
  });
} finally {
  await db.destroy();
}
