import { describe, expect, it } from 'vitest';
import {
  isoDateSchema,
  DEFAULT_RESERVATION_SETTINGS,
  closureSchema,
  openingHoursSchema,
  reservationRequestSchema,
  reservationSettingsSchema,
} from './reservation.schema';

const valid = {
  partySize: 4,
  date: '2027-03-12',
  time: '19:30',
  name: 'Ana Perez',
  email: 'ana@example.com',
  phone: '+49 170 1234567',
  lang: 'es',
  privacyAccepted: true,
};

describe('reservationRequestSchema', () => {
  it('accepts a valid request and defaults the honeypot', () => {
    const r = reservationRequestSchema.parse(valid);
    expect(r.website).toBe('');
  });

  it('rejects a filled honeypot', () => {
    expect(reservationRequestSchema.safeParse({ ...valid, website: 'x' }).success).toBe(false);
  });

  it('rejects privacyAccepted false', () => {
    expect(reservationRequestSchema.safeParse({ ...valid, privacyAccepted: false }).success).toBe(
      false,
    );
  });

  it('rejects times that are not multiples of 30 minutes', () => {
    expect(reservationRequestSchema.safeParse({ ...valid, time: '13:15' }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ ...valid, time: '13:00' }).success).toBe(true);
  });

  it('rejects bad phone, name, date, comment, language, email and party size', () => {
    const cases = [
      { phone: 'abc123' },
      { name: 'A' },
      { date: '12.03.2027' },
      { comment: 'x'.repeat(501) },
      { lang: 'fr' },
      { email: 'nope' },
      { phone: '+ + + + +' },
      { date: '2027-02-31' },
      { partySize: 0 },
    ];
    for (const bad of cases) {
      expect(reservationRequestSchema.safeParse({ ...valid, ...bad }).success).toBe(false);
    }
  });
});

describe('openingHoursSchema', () => {
  it('accepts non-overlapping ranges', () => {
    const r = openingHoursSchema.safeParse([
      { weekday: 2, opens: '12:00', closes: '15:00' },
      { weekday: 2, opens: '18:00', closes: '22:00' },
    ]);
    expect(r.success).toBe(true);
  });

  it('rejects opens >= closes', () => {
    expect(
      openingHoursSchema.safeParse([{ weekday: 2, opens: '15:00', closes: '15:00' }]).success,
    ).toBe(false);
  });

  it('rejects overlaps on the same day only', () => {
    const a = { weekday: 2, opens: '12:00', closes: '16:00' };
    const b = { weekday: 2, opens: '15:00', closes: '22:00' };
    expect(openingHoursSchema.safeParse([a, b]).success).toBe(false);
    expect(openingHoursSchema.safeParse([a, { ...b, weekday: 3 }]).success).toBe(true);
  });

  it('rejects opening times off the half-hour grid', () => {
    expect(
      openingHoursSchema.safeParse([{ weekday: 2, opens: '12:15', closes: '15:00' }]).success,
    ).toBe(false);
  });

  it('rejects weekday out of range', () => {
    expect(
      openingHoursSchema.safeParse([{ weekday: 7, opens: '12:00', closes: '15:00' }]).success,
    ).toBe(false);
  });
});

describe('isoDateSchema', () => {
  it('rejects non-existent dates', () => {
    expect(isoDateSchema.safeParse('2027-02-31').success).toBe(false);
    expect(isoDateSchema.safeParse('2027-13-01').success).toBe(false);
    expect(isoDateSchema.safeParse('2028-02-29').success).toBe(true);
  });
});

describe('closureSchema', () => {
  it('requires from <= to', () => {
    expect(closureSchema.safeParse({ from: '2027-01-02', to: '2027-01-01' }).success).toBe(false);
    expect(closureSchema.safeParse({ from: '2027-01-01', to: '2027-01-01' }).success).toBe(true);
  });
});

describe('reservationSettingsSchema', () => {
  it('accepts the defaults', () => {
    expect(reservationSettingsSchema.parse(DEFAULT_RESERVATION_SETTINGS)).toEqual(
      DEFAULT_RESERVATION_SETTINGS,
    );
  });

  it('rejects slotMinutes other than 30', () => {
    const s = DEFAULT_RESERVATION_SETTINGS;
    expect(reservationSettingsSchema.safeParse({ ...s, slotMinutes: 45 }).success).toBe(false);
  });

  it('rejects partyMin > partyMax and out-of-range values', () => {
    const s = DEFAULT_RESERVATION_SETTINGS;
    expect(reservationSettingsSchema.safeParse({ ...s, partyMin: 11 }).success).toBe(false);
    expect(reservationSettingsSchema.safeParse({ ...s, capacityPerSlot: 0 }).success).toBe(false);
  });
});
