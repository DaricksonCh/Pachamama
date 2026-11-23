/** Weekday names indexed 0 = Sunday, from a known Sunday (2026-11-22) so no i18n keys are needed. */
export function weekdayNames(lang: string, width: 'long' | 'short' | 'narrow'): string[] {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: width, timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(Date.UTC(2026, 10, 22 + i))).replace(/\.$/, ''),
  );
}

/** "24. Dezember" / "24 de diciembre" for a `YYYY-MM-DD` date. */
export function formatDayMonth(lang: string, date: string): string {
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
