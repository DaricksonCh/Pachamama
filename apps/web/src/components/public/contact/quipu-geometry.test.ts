import { describe, expect, it } from 'vitest';
import { knotHours, quipuAxis } from './quipu-geometry';

describe('quipuAxis', () => {
  it('spans from the earliest opening to the latest closing, in whole hours', () => {
    expect(
      quipuAxis([
        { weekday: 2, opens: '12:30', closes: '15:00' },
        { weekday: 5, opens: '18:00', closes: '23:30' },
      ]),
    ).toEqual({ start: 12, end: 24 });
  });

  it('falls back to 12–22 when there are no hours yet', () => {
    expect(quipuAxis([])).toEqual({ start: 12, end: 22 });
  });
});

describe('knotHours', () => {
  const axis = { start: 12, end: 22 };

  it('ties one knot per hour whose middle is open, leaving the break between shifts bare', () => {
    const day = {
      weekday: 2,
      ranges: [
        { opens: '12:00', closes: '15:00' },
        { opens: '18:00', closes: '22:00' },
      ],
    };
    expect(knotHours(day, axis)).toEqual([12, 13, 14, 18, 19, 20, 21]);
  });

  it('counts a half hour only when the middle of that hour is open', () => {
    expect(knotHours({ weekday: 3, ranges: [{ opens: '12:30', closes: '14:00' }] }, axis)).toEqual([
      12, 13,
    ]);
    expect(knotHours({ weekday: 3, ranges: [{ opens: '12:45', closes: '14:00' }] }, axis)).toEqual([
      13,
    ]);
  });

  it('has no knots on a rest day', () => {
    expect(knotHours({ weekday: 1, ranges: [] }, axis)).toEqual([]);
  });
});
