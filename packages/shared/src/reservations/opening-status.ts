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
