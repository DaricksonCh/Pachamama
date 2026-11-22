import type { Language } from '@pachamama/shared';

/** The restaurant's time zone: dates and times are always shown in it, never in the browser's. */
export const RESTAURANT_TZ = 'Europe/Berlin';

/** `YYYY-MM-DD` of a calendar date (the day the visitor sees in the date picker). */
export function toIsoDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `YYYY-MM` of a calendar date. */
export const toMonthKey = (date: Date): string => toIsoDate(date).slice(0, 7);

/** Local calendar date (midnight) of a `YYYY-MM-DD` string, as the date picker expects. */
export function fromIsoDate(iso: string): Date {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** `YYYY-MM-DD` of an instant, as seen in the restaurant's time zone. */
export function localIsoDate(instant: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(typeof instant === 'string' ? new Date(instant) : instant);
}

/** Today's calendar date in the restaurant's time zone, as a local-midnight `Date`. */
export function restaurantToday(now: Date = new Date()): Date {
  return fromIsoDate(localIsoDate(now));
}

/** Long date label ("Mittwoch, 25. November 2026"), parsed at UTC noon so no zone can shift the day. */
export function formatDateLabel(iso: string, lang: Language): string {
  return new Intl.DateTimeFormat(lang, {
    timeZone: RESTAURANT_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** Restaurant-local `HH:mm` of an instant (success view, from the API's `startsAt`). */
export function formatLocalTime(startsAt: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: RESTAURANT_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(startsAt));
}

/** Slots before 17:00 are lunch, the rest dinner. */
export const isLunch = (time: string): boolean => time < '17:00';

/** Short date for the summary ("Mi., 25. Nov."), same UTC-noon trick as `formatDateLabel`. */
export function formatDateShort(iso: string, lang: Language): string {
  return new Intl.DateTimeFormat(lang, {
    timeZone: RESTAURANT_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${iso}T12:00:00Z`));
}
