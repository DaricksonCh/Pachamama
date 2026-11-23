import { describe, expect, it } from 'vitest';
import {
  groupWeek,
  nextOpening,
  openingStatus,
  publicOpeningHoursSchema,
  upcomingClosure,
  weekSchedule,
} from './opening-status';
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

describe('nextOpening', () => {
  const week = {
    hours: [2, 3, 4, 5, 6, 0].map((weekday) => ({ weekday, opens: '13:00', closes: '22:00' })),
    closures: [] as { from: string; to: string }[],
  };

  it('is tomorrow when the restaurant rests today', () => {
    expect(nextOpening(at(MON, '15:00'), week)).toEqual({
      date: TUE,
      weekday: 2,
      daysAhead: 1,
      opens: '13:00',
    });
  });

  it('skips the rest day and closures', () => {
    // Sunday night → Monday rests → Tuesday.
    expect(nextOpening(at('2026-11-22', '23:00'), week)?.date).toBe(TUE);
    const closed = { ...week, closures: [{ from: TUE, to: '2026-11-25' }] };
    expect(nextOpening(at(MON, '15:00'), closed)).toMatchObject({
      date: '2026-11-26',
      daysAhead: 3,
    });
  });

  it('takes the first shift of a split day and gives up without any hours', () => {
    expect(nextOpening(at(MON, '10:00'), split)?.opens).toBe('12:00');
    expect(nextOpening(at(MON, '10:00'), { hours: [], closures: [] })).toBeNull();
  });
});

describe('groupWeek', () => {
  it('joins consecutive days with the same hours and puts rest days last', () => {
    const hours = [2, 3, 4, 5, 6, 0].map((weekday) => ({
      weekday,
      opens: '13:00',
      closes: '22:00',
    }));
    expect(groupWeek(hours)).toEqual([
      { weekdays: [2, 3, 4, 5, 6, 0], ranges: [{ opens: '13:00', closes: '22:00' }] },
      { weekdays: [1], ranges: [] },
    ]);
  });

  it('starts a new group when the hours change, also for split shifts', () => {
    const groups = groupWeek(split.hours);
    expect(groups.map((g) => g.weekdays)).toEqual([[2], [0], [1], [3, 4, 5, 6]]);
    expect(groups[0]?.ranges).toHaveLength(2);
  });
});

describe('upcomingClosure', () => {
  const data = (closures: { from: string; to: string }[]) => ({ hours: split.hours, closures });

  it('returns the nearest closure that starts after today', () => {
    const c = [
      { from: '2026-12-24', to: '2026-12-26' },
      { from: '2026-12-01', to: '2026-12-02' },
    ];
    expect(upcomingClosure(at(MON, '12:00'), data(c))).toEqual(c[1]);
  });

  it('ignores a closure running today and those too far ahead', () => {
    expect(upcomingClosure(at(MON, '12:00'), data([{ from: MON, to: TUE }]))).toBeNull();
    expect(
      upcomingClosure(at(MON, '12:00'), data([{ from: '2027-02-01', to: '2027-02-02' }])),
    ).toBeNull();
  });
});
