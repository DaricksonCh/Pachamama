import { RESTAURANT_TIME_ZONE } from '@pachamama/shared';

/** `HH:mm` de un instante en la hora del restaurante (nunca la del navegador). */
export function formatTime(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    timeZone: RESTAURANT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/** Fecha y hora cortas de un instante, en la hora del restaurante. */
export function formatDateTime(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    timeZone: RESTAURANT_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/** Suma días a un `YYYY-MM-DD` sin que ninguna zona horaria pueda cambiar el día. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
