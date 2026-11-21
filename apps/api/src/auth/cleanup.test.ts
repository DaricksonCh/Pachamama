import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/database';
import { resetAuthTables } from '../test/db-helpers';
import { deleteExpiredAuthData } from './cleanup';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  await resetAuthTables();
  await db
    .insertInto('users')
    .values({ id: 'u1', name: 'Ana', email: 'ana@pachamama.test' })
    .execute();
});

describe('limpieza de datos de autenticación caducados (DSGVO)', () => {
  it('borra sesiones y verificaciones caducadas y conserva las vigentes', async () => {
    const now = new Date();
    await db
      .insertInto('sessions')
      .values([
        {
          id: 's-old',
          token: 't-old',
          userId: 'u1',
          expiresAt: new Date(now.getTime() - DAY),
          ipAddress: '10.0.0.1',
          userAgent: 'x',
        },
        {
          id: 's-live',
          token: 't-live',
          userId: 'u1',
          expiresAt: new Date(now.getTime() + DAY),
          ipAddress: null,
          userAgent: null,
          impersonatedBy: null,
        },
      ])
      .execute();
    await db
      .insertInto('verifications')
      .values([
        { id: 'v-old', identifier: 'a', value: 'x', expiresAt: new Date(now.getTime() - DAY) },
        { id: 'v-live', identifier: 'b', value: 'y', expiresAt: new Date(now.getTime() + DAY) },
      ])
      .execute();

    expect(await deleteExpiredAuthData(db, now)).toEqual({ sessions: 1, verifications: 1 });

    const sessions = await db.selectFrom('sessions').select('id').execute();
    const verifications = await db.selectFrom('verifications').select('id').execute();
    expect(sessions.map((s) => s.id)).toEqual(['s-live']);
    expect(verifications.map((v) => v.id)).toEqual(['v-live']);
  });

  it('no hace nada si no hay datos caducados', async () => {
    expect(await deleteExpiredAuthData(db)).toEqual({ sessions: 0, verifications: 0 });
  });
});

describe('tipos de la BD', () => {
  it('los BOOLEAN llegan como boolean, no como 0/1', async () => {
    await db.updateTable('users').set({ banned: true }).where('id', '=', 'u1').execute();
    const user = await db
      .selectFrom('users')
      .select(['banned', 'emailVerified'])
      .where('id', '=', 'u1')
      .executeTakeFirstOrThrow();

    expect(user.banned).toBe(true);
    expect(user.emailVerified).toBe(false);
  });
});
