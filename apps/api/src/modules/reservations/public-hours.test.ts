import { addDays, publicOpeningHoursSchema, toRestaurantLocal } from '@pachamama/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { db } from '../../db/database';
import { resetReservationConfig } from '../../test/db-helpers';
import { settingsService } from './settings.routes';

const app = createApp();
const URL = '/api/v1/opening-hours';
const today = () => toRestaurantLocal(new Date()).date;
const asDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

beforeEach(async () => {
  await resetReservationConfig();
  settingsService.invalidate();
});
afterEach(async () => {
  await resetReservationConfig();
  settingsService.invalidate();
});

describe('GET /api/v1/opening-hours (público)', () => {
  it('devuelve el horario semanal sin sesión y con la forma del schema compartido', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(200);
    const data = publicOpeningHoursSchema.parse(res.body.data);
    expect(data.hours).toHaveLength(6);
    expect(data.hours.some((h) => h.weekday === 1)).toBe(false); // lunes cerrado
    expect(data.hours).toContainEqual({ weekday: 2, opens: '13:00', closes: '22:00' });
    expect(data.closures).toEqual([]);
  });

  it('incluye solo las fechas de los cierres próximos, nunca el motivo', async () => {
    const from = addDays(today(), 3);
    const to = addDays(today(), 5);
    await db
      .insertInto('closures')
      .values([
        { fromDate: asDate(from), toDate: asDate(to), reasonDe: 'Intern', reasonEs: 'Interno' },
        // Ya pasado: no se muestra.
        {
          fromDate: asDate(addDays(today(), -10)),
          toDate: asDate(addDays(today(), -8)),
          reasonDe: null,
          reasonEs: null,
        },
      ])
      .execute();
    settingsService.invalidate();

    const res = await request(app).get(URL);
    expect(res.status).toBe(200);
    expect(res.body.data.closures).toEqual([{ from, to }]);
    expect(JSON.stringify(res.body)).not.toMatch(/Intern|reason/);
  });

  it('refleja los cambios del panel en cuanto se guardan', async () => {
    await settingsService.replaceHours([
      { weekday: 3, opens: '12:00', closes: '15:00' },
      { weekday: 3, opens: '18:00', closes: '22:00' },
    ]);
    const res = await request(app).get(URL);
    expect(res.body.data.hours).toEqual([
      { weekday: 3, opens: '12:00', closes: '15:00' },
      { weekday: 3, opens: '18:00', closes: '22:00' },
    ]);
  });

  it('no acepta escrituras', async () => {
    const res = await request(app).post(URL).set('Origin', 'http://localhost:5173').send({});
    expect(res.status).toBe(404);
  });
});
