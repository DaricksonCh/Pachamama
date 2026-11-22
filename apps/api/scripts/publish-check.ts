/**
 * Blocks publication while provisional data remains (docs/pendientes.md).
 *   npm run check:publish
 * Not part of check:all on purpose: it is red until the restaurant confirms its data.
 * Run it against the production database before going live (M4).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { env } from '../src/config/env';
import { db } from '../src/db/database';
import {
  collectPublishIssues,
  flattenTranslations,
  restaurantPublishInfo,
} from '../src/publish/publish-readiness';

const localesDir = resolve(import.meta.dirname, '../../web/src/locales');

try {
  const translations = ['de', 'es'].flatMap((lang) =>
    flattenTranslations(JSON.parse(readFileSync(join(localesDir, lang, 'common.json'), 'utf8'))),
  );
  const dishes = await db
    .selectFrom('dishes')
    .innerJoin('menuCategories', 'menuCategories.id', 'dishes.categoryId')
    .select(['dishes.nameDe', 'dishes.isProvisional', 'dishes.imageKey'])
    .where('dishes.status', '=', 'visible')
    .where('menuCategories.status', '=', 'visible')
    .execute();

  const settings = await db
    .selectFrom('reservationSettings')
    .select('hoursConfirmed')
    .where('id', '=', 1)
    .executeTakeFirst();

  const issues = collectPublishIssues({
    reservations: {
      hoursConfirmed: Boolean(settings?.hoursConfirmed),
      notifyEmail: env.RESERVATIONS_NOTIFY_EMAIL,
    },
    ...restaurantPublishInfo(),
    translations,
    dishes: dishes.map((d) => ({ ...d, isProvisional: Boolean(d.isProvisional) })),
    imageExists: (key) => existsSync(join(env.UPLOADS_DIR, 'dishes', `${key}-400.webp`)),
  });

  if (issues.length > 0) {
    console.error(`✖ The site is not ready to publish (${issues.length} issue(s)):`);
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exitCode = 1;
  } else {
    console.log('✔ Ready to publish: no provisional data left');
  }
} catch (err) {
  console.error('✖', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
