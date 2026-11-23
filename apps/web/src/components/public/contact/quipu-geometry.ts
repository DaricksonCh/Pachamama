import type { DaySchedule, OpeningHours } from '@pachamama/shared';

const toHours = (time: string) => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h + m / 60;
};

/** Hour range shown on the cords: from the earliest opening to the latest closing of the week. */
export function quipuAxis(hours: OpeningHours): { start: number; end: number } {
  if (hours.length === 0) return { start: 12, end: 22 };
  const start = Math.floor(Math.min(...hours.map((r) => toHours(r.opens))));
  const end = Math.ceil(Math.max(...hours.map((r) => toHours(r.closes))));
  return { start, end };
}

/** Full hours (as numbers) whose middle falls inside one of the day's ranges: one knot each. */
export function knotHours(day: DaySchedule, axis: { start: number; end: number }): number[] {
  const knots: number[] = [];
  for (let h = axis.start; h < axis.end; h++) {
    const mid = h + 0.5;
    if (day.ranges.some((r) => toHours(r.opens) <= mid && mid < toHours(r.closes))) knots.push(h);
  }
  return knots;
}
