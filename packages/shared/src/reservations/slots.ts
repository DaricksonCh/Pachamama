import { TZDate } from '@date-fns/tz';
import { isRealDate } from './reservation.schema';
import type { Closure, OpeningHours, ReservationSettings } from './reservation.schema';

export const RESTAURANT_TIME_ZONE = 'Europe/Berlin';

export type Slot = {
  time: string; // HH:mm, restaurant local time
  startsAt: string; // ISO UTC
  available: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Restaurant-local date + time to a UTC instant (DST-aware). */
export function toUtc(date: string, time: string): Date {
  const [y = 0, mo = 1, d = 1] = date.split('-').map(Number);
  const [h = 0, mi = 0] = time.split(':').map(Number);
  return new Date(new TZDate(y, mo - 1, d, h, mi, 0, 0, RESTAURANT_TIME_ZONE).getTime());
}

/** UTC instant to restaurant-local date (YYYY-MM-DD) and time (HH:mm). */
export function toRestaurantLocal(d: Date): { date: string; time: string } {
  const t = new TZDate(d.getTime(), RESTAURANT_TIME_ZONE);
  return {
    date: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`,
    time: `${pad(t.getHours())}:${pad(t.getMinutes())}`,
  };
}

const toMinutes = (time: string): number => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (total: number): string => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

/** Calendar-day number of a YYYY-MM-DD string (no time zone involved). */
const dayNumber = (date: string): number => {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** 0 = Sunday. */
const weekdayOf = (date: string): number => new Date(dayNumber(date) * 86_400_000).getUTCDay();

type DayInput = {
  now: Date;
  hours: OpeningHours;
  closures: Closure[];
  settings: ReservationSettings;
};

function daySlots(date: string, input: DayInput): { time: string; startsAt: Date }[] {
  const { now, hours, closures, settings } = input;
  if (!isRealDate(date)) return [];
  const today = toRestaurantLocal(now).date;
  const diff = dayNumber(date) - dayNumber(today);
  if (diff < 0 || diff > settings.maxAdvanceDays) return [];
  if (diff === 0 && !settings.sameDayOnline) return [];
  if (closures.some((c) => c.from <= date && date <= c.to)) return [];

  const earliest = now.getTime() + settings.minLeadMinutes * 60_000;
  const weekday = weekdayOf(date);
  const out: { time: string; startsAt: Date }[] = [];
  for (const range of hours) {
    if (range.weekday !== weekday) continue;
    const last = toMinutes(range.closes) - settings.lastSlotBeforeCloseMinutes;
    for (let m = toMinutes(range.opens); m <= last; m += settings.slotMinutes) {
      const time = fromMinutes(m);
      const startsAt = toUtc(date, time);
      if (startsAt.getTime() >= earliest) out.push({ time, startsAt });
    }
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function buildDaySlots(
  input: DayInput & {
    date: string;
    bookedByStart: Map<string, number>;
    partySize: number;
  },
): Slot[] {
  return daySlots(input.date, input).map(({ time, startsAt }) => {
    const iso = startsAt.toISOString();
    const booked = input.bookedByStart.get(iso) ?? 0;
    return {
      time,
      startsAt: iso,
      available: booked + input.partySize <= input.settings.capacityPerSlot,
    };
  });
}

/** Days of the month with at least one future slot (capacity is not considered). */
export function availableDays(input: DayInput & { month: string }): string[] {
  const [y = 0, m = 1] = input.month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${input.month}-${pad(d)}`;
    if (daySlots(date, input).length > 0) days.push(date);
  }
  return days;
}
