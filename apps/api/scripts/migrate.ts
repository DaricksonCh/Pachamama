/**
 * Migraciones de la BD.
 *   npm run db:migrate        → aplica las pendientes
 *   npm run db:migrate:down   → deshace la última
 */
import { db } from '../src/db/database';
import { migrateDownOne, migrateToLatest } from '../src/db/migrator';

const direction = process.argv[2] === 'down' ? 'down' : 'up';

try {
  const results = direction === 'down' ? await migrateDownOne(db) : await migrateToLatest(db);
  if (results.length === 0) console.log('Nada que hacer: la BD ya está al día.');
  for (const r of results) {
    console.log(`${r.status === 'Success' ? '✔' : '✖'} ${r.direction} ${r.migrationName}`);
  }
} catch (err) {
  console.error('✖', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
