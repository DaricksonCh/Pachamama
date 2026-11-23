import { RESTAURANT_TIME_ZONE } from '@pachamama/shared';

/** Fecha y hora cortas de un instante, en la hora del restaurante. */
export function formatDateTime(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    timeZone: RESTAURANT_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(new Date(iso));
}
