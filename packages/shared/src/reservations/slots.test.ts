import { describe, expect, it } from 'vitest';
import { DEFAULT_RESERVATION_SETTINGS, type OpeningHours } from './reservation.schema';
import { availableDays, buildDaySlots, toRestaurantLocal, toUtc } from './slots';

// weekday: 0 = Sunday. 2027-03-02 is a Tuesday, 2027-03-01 a Monday.
const hours: OpeningHours = [{ weekday: 2, opens: '13:00', closes: '22:00' }];
const settings = DEFAULT_RESERVATION_SETTINGS;
const base = {
  hours,
  closures: [],
  settings,
  bookedByStart: new Map<string, number>(),
  partySize: 2,
};
// Well before the date, so lead time does not interfere.
const early = new Date('2027-02-20T10:00:00Z');

describe('buildDaySlots', () => {
  it('lists 13:00..21:00 on an open day (17 slots)', () => {
    const slots = buildDaySlots({ ...base, date: '2027-03-02', now: early });
    expect(slots).toHaveLength(17);
    expect(slots[0]?.time).toBe('13:00');
    expect(slots.at(-1)?.time).toBe('21:00');
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('returns [] on a day without opening hours', () => {
    expect(buildDaySlots({ ...base, date: '2027-03-01', now: early })).toEqual([]);
  });

  it('returns [] inside a closure', () => {
    const closures = [{ from: '2027-03-01', to: '2027-03-03' }];
    expect(buildDaySlots({ ...base, closures, date: '2027-03-02', now: early })).toEqual([]);
  });

  it('returns [] for same-day booking when sameDayOnline is false', () => {
    const now = new Date('2027-03-02T13:10:00Z'); // 14:10 Berlin (CET)
    expect(buildDaySlots({ ...base, date: '2027-03-02', now })).toEqual([]);
  });

  it('with sameDayOnline the first slot respects the lead time (16:30)', () => {
    const now = new Date('2027-03-02T13:10:00Z'); // 14:10 Berlin
    const slots = buildDaySlots({
      ...base,
      settings: { ...settings, sameDayOnline: true },
      date: '2027-03-02',
      now,
    });
    expect(slots[0]?.time).toBe('16:30');
  });

  it('marks a slot unavailable when the party would exceed capacity', () => {
    const bookedByStart = new Map([['2027-03-02T12:00:00.000Z', 28]]); // 13:00 Berlin
    const args = { ...base, bookedByStart, date: '2027-03-02', now: early };
    const full = buildDaySlots({ ...args, partySize: 3 });
    expect(full[0]).toMatchObject({ time: '13:00', available: false });
    expect(full[1]?.available).toBe(true);
    expect(buildDaySlots({ ...args, partySize: 2 })[0]?.available).toBe(true);
  });

  it('computes startsAt across DST changes', () => {
    const sunday: OpeningHours = [{ weekday: 0, opens: '13:00', closes: '22:00' }];
    const spring = buildDaySlots({
      ...base,
      hours: sunday,
      date: '2026-03-29',
      now: new Date('2026-03-20T10:00:00Z'),
    });
    expect(spring[0]?.startsAt).toBe('2026-03-29T11:00:00.000Z');
    const autumn = buildDaySlots({
      ...base,
      hours: sunday,
      date: '2026-10-25',
      now: new Date('2026-10-10T10:00:00Z'),
    });
    expect(autumn[0]?.startsAt).toBe('2026-10-25T12:00:00.000Z');
  });

  it('returns [] beyond maxAdvanceDays and allows the boundary day', () => {
    const now = new Date('2027-03-02T10:00:00Z');
    const everyDay: OpeningHours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      opens: '13:00',
      closes: '22:00',
    }));
    const args = { ...base, hours: everyDay, now };
    expect(buildDaySlots({ ...args, date: '2027-05-01' }).length).toBeGreaterThan(0); // +60
    expect(buildDaySlots({ ...args, date: '2027-05-02' })).toEqual([]); // +61
  });

  it('returns [] for past dates', () => {
    expect(
      buildDaySlots({ ...base, date: '2027-03-02', now: new Date('2027-03-09T10:00:00Z') }),
    ).toEqual([]);
  });

  it('supports split service (two ranges)', () => {
    const split: OpeningHours = [
      { weekday: 2, opens: '12:00', closes: '14:00' },
      { weekday: 2, opens: '18:00', closes: '21:00' },
    ];
    const times = buildDaySlots({ ...base, hours: split, date: '2027-03-02', now: early }).map(
      (s) => s.time,
    );
    expect(times).toEqual(['12:00', '12:30', '13:00', '18:00', '18:30', '19:00', '19:30', '20:00']);
  });
});

describe('availableDays', () => {
  it('lists only open, non-closed, bookable days of the month', () => {
    const days = availableDays({
      month: '2027-03',
      now: early,
      hours,
      closures: [{ from: '2027-03-09', to: '2027-03-09' }],
      settings,
    });
    expect(days).toEqual(['2027-03-02', '2027-03-16', '2027-03-23', '2027-03-30']);
  });
});

describe('time zone helpers', () => {
  it('round-trips toUtc and toRestaurantLocal', () => {
    const d = toUtc('2026-03-29', '13:00');
    expect(d.toISOString()).toBe('2026-03-29T11:00:00.000Z');
    expect(toRestaurantLocal(d)).toEqual({ date: '2026-03-29', time: '13:00' });
  });
});
