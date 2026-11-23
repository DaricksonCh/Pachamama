import { z } from 'zod';
import { isoDateSchema, openingHoursSchema, type OpeningHours } from './reservation.schema';
import { toRestaurantLocal } from './slots';

/**
 * Public view of the opening hours (`GET /api/v1/opening-hours`): the weekly ranges the staff edit
 * in the panel plus the dates of upcoming closures. No free text, nothing personal.
 */
export const publicOpeningHoursSchema = z.object({
  hours: openingHoursSchema,
  closures: z.array(z.object({ from: isoDateSchema, to: isoDateSchema })),
});
export type PublicOpeningHours = z.infer<typeof publicOpeningHoursSchema>;

/** Weekdays in the order a German or Spanish week is read: Monday … Sunday (0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export type DaySchedule = { weekday: number; ranges: { opens: string; closes: string }[] };

/** One entry per weekday, Monday first, each with its ranges sorted by opening time. */
export function weekSchedule(hours: OpeningHours): DaySchedule[] {
  return WEEK_ORDER.map((weekday) => ({
    weekday,
    ranges: hours
      .filter((r) => r.weekday === weekday)
      .map(({ opens, closes }) => ({ opens, closes }))
      .sort((a, b) => a.opens.localeCompare(b.opens)),
  }));
}

export type OpeningStatus =
  | { state: 'open'; closes: string }
  | { state: 'opensLater'; opens: string }
  | { state: 'closedToday' }
  | { state: 'closure'; until: string };

/** 0 = Sunday, for a `YYYY-MM-DD` calendar date. */
export const weekdayOfDate = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

/** Whether the restaurant is open at `now` (restaurant time), taking closures into account. */
export function openingStatus(now: Date, data: PublicOpeningHours): OpeningStatus {
  const { date, time } = toRestaurantLocal(now);
  const closure = data.closures.find((c) => c.from <= date && date <= c.to);
  if (closure) return { state: 'closure', until: closure.to };

  const weekday = weekdayOfDate(date);
  const today = weekSchedule(data.hours).find((d) => d.weekday === weekday)?.ranges ?? [];
  const current = today.find((r) => r.opens <= time && time < r.closes);
  if (current) return { state: 'open', closes: current.closes };
  const next = today.find((r) => time < r.opens);
  if (next) return { state: 'opensLater', opens: next.opens };
  return { state: 'closedToday' };
}

/** `YYYY-MM-DD` plus `days` calendar days (UTC arithmetic, no time zone involved). */
const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * The next time the restaurant opens after today (restaurant time), skipping rest days and
 * closures: `daysAhead` 1 = tomorrow. `null` if nothing opens in the next 60 days.
 */
export function nextOpening(
  now: Date,
  data: PublicOpeningHours,
): { date: string; weekday: number; daysAhead: number; opens: string } | null {
  const { date: today } = toRestaurantLocal(now);
  const week = weekSchedule(data.hours);
  for (let daysAhead = 1; daysAhead <= 60; daysAhead++) {
    const date = addDays(today, daysAhead);
    if (data.closures.some((c) => c.from <= date && date <= c.to)) continue;
    const weekday = weekdayOfDate(date);
    const first = week.find((d) => d.weekday === weekday)?.ranges[0];
    if (first) return { date, weekday, daysAhead, opens: first.opens };
  }
  return null;
}

export type WeekGroup = {
  /** Weekdays (0 = Sunday) in reading order, Monday first; consecutive, same hours. */
  weekdays: number[];
  ranges: { opens: string; closes: string }[];
};

/**
 * Compact summary of the week: consecutive days with the same hours share one line
 * ("Tue–Sun 13:00–22:00"), and the rest days come last ("Mon closed").
 */
export function groupWeek(hours: OpeningHours): WeekGroup[] {
  const key = (r: WeekGroup['ranges']) => r.map((x) => `${x.opens}-${x.closes}`).join(',');
  const groups: WeekGroup[] = [];
  for (const day of weekSchedule(hours)) {
    const last = groups.at(-1);
    if (last && key(last.ranges) === key(day.ranges)) last.weekdays.push(day.weekday);
    else groups.push({ weekdays: [day.weekday], ranges: day.ranges });
  }
  return [...groups.filter((g) => g.ranges.length), ...groups.filter((g) => !g.ranges.length)];
}

/** The nearest closure that starts after today and within `withinDays` days, if any. */
export function upcomingClosure(
  now: Date,
  data: PublicOpeningHours,
  withinDays = 30,
): { from: string; to: string } | null {
  const { date: today } = toRestaurantLocal(now);
  const limit = addDays(today, withinDays);
  return (
    [...data.closures]
      .filter((c) => c.from > today && c.from <= limit)
      .sort((a, b) => a.from.localeCompare(b.from))[0] ?? null
  );
}
