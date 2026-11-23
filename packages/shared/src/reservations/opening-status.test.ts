import { describe, expect, it } from 'vitest';
import { openingStatus, publicOpeningHoursSchema, weekSchedule } from './opening-status';
import { toUtc } from './slots';

// 2026-11-24 is a Tuesday, 2026-11-23 a Monday.
const TUE = '2026-11-24';
const MON = '2026-11-23';
const split = {
  hours: [
    { weekday: 2, opens: '18:00', closes: '22:00' },
    { weekday: 2, opens: '12:00', closes: '15:00' },
    { weekday: 0, opens: '13:00', closes: '22:00' },
  ],
  closures: [],
};
const at = (date: string, time: string) => toUtc(date, time);

describe('weekSchedule', () => {
  it('lists Monday to Sunday with sorted ranges and empty rest days', () => {
    const week = weekSchedule(split.hours);
    expect(week.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(week[0]?.ranges).toEqual([]);
    expect(week[1]?.ranges).toEqual([
      { opens: '12:00', closes: '15:00' },
      { opens: '18:00', closes: '22:00' },
    ]);
  });
});

describe('openingStatus', () => {
  it('is open inside a range and says when it closes', () => {
    expect(openingStatus(at(TUE, '13:30'), split)).toEqual({ state: 'open', closes: '15:00' });
  });

  it('opens later between a lunch and a dinner shift, and before the first one', () => {
    expect(openingStatus(at(TUE, '16:00'), split)).toEqual({ state: 'opensLater', opens: '18:00' });
    expect(openingStatus(at(TUE, '09:00'), split)).toEqual({ state: 'opensLater', opens: '12:00' });
  });

  it('is closed after the last range and on a rest day', () => {
    expect(openingStatus(at(TUE, '22:00'), split)).toEqual({ state: 'closedToday' });
    expect(openingStatus(at(MON, '14:00'), split)).toEqual({ state: 'closedToday' });
  });

  it('reports a closure that covers today, whatever the hours say', () => {
    const data = { ...split, closures: [{ from: '2026-11-20', to: '2026-11-30' }] };
    expect(openingStatus(at(TUE, '13:30'), data)).toEqual({
      state: 'closure',
      until: '2026-11-30',
    });
  });

  it('uses restaurant time, not UTC (12:30 UTC is 13:30 in Berlin in winter)', () => {
    const sundayNoonUtc = new Date('2026-11-22T12:30:00Z');
    expect(openingStatus(sundayNoonUtc, split)).toEqual({ state: 'open', closes: '22:00' });
  });
});

describe('publicOpeningHoursSchema', () => {
  it('accepts the API shape and rejects bad dates', () => {
    expect(publicOpeningHoursSchema.safeParse(split).success).toBe(true);
    expect(
      publicOpeningHoursSchema.safeParse({ ...split, closures: [{ from: 'x', to: TUE }] }).success,
    ).toBe(false);
  });
});
