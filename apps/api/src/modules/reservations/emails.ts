import { RESTAURANT_INFO, RESTAURANT_TIME_ZONE, type Language } from '@pachamama/shared';

export type EmailKind = 'received' | 'confirmed' | 'rejected' | 'cancelled';

export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
}

const LOCALES: Record<Language, string> = { de: 'de-DE', es: 'es-ES' };
const LABELS: Record<Language, { date: string; time: string; party: string; address: string }> = {
  de: { date: 'Datum', time: 'Uhrzeit', party: 'Personen', address: 'Adresse' },
  es: { date: 'Fecha', time: 'Hora', party: 'Personas', address: 'Dirección' },
};

const BRAND_GREEN = '#2f4a2b';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const toHtml = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br>');

export function formatDateTime(startsAt: Date, lang: Language) {
  const locale = LOCALES[lang];
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: RESTAURANT_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(startsAt);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: RESTAURANT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(startsAt);
  return { date, time };
}

const addressLine = () => {
  const { street, postalCode, city } = RESTAURANT_INFO.address;
  return `${street}, ${postalCode} ${city}`;
};

function layout(bodyHtml: string, detailsHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif;color:#222;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;">
<div style="background:${BRAND_GREEN};color:#ffffff;padding:16px 24px;font-size:20px;font-weight:bold;">${escapeHtml(RESTAURANT_INFO.name)}</div>
<div style="padding:24px;font-size:15px;line-height:1.5;">${bodyHtml}</div>
<div style="padding:0 24px 24px;font-size:14px;line-height:1.5;">${detailsHtml}</div>
</div></body></html>`;
}

function detailsTable(rows: Array<[string, string]>): string {
  // Values are multi-line plain text: same escape + newline handling as the body.
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:2px 12px 2px 0;color:#555;">${escapeHtml(k)}</td><td style="padding:2px 0;"><strong>${toHtml(v)}</strong></td></tr>`,
    )
    .join('');
  return `<table style="border-top:1px solid #ddd;padding-top:8px;width:100%;" cellpadding="0" cellspacing="0">${tr}</table>`;
}

export function buildDecisionEmail(input: {
  kind: EmailKind;
  lang: Language;
  subject: string;
  body: string;
  reservation: { startsAt: Date; partySize: number; name: string };
}): BuiltEmail {
  const { lang, subject, body, reservation } = input;
  const l = LABELS[lang];
  const { date, time } = formatDateTime(reservation.startsAt, lang);
  const rows: Array<[string, string]> = [
    [l.date, date],
    [l.time, time],
    [l.party, String(reservation.partySize)],
    [l.address, addressLine()],
  ];
  const text = `${body}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n`;
  return { subject, text, html: layout(toHtml(body), detailsTable(rows)) };
}

export function buildStaffNotification(
  reservation: {
    publicId: string;
    id: number;
    startsAt: Date;
    partySize: number;
    name: string;
    phone: string;
    comment: string | null;
  },
  webOrigin: string,
): BuiltEmail {
  const { date, time } = formatDateTime(reservation.startsAt, 'de');
  const link = `${webOrigin}/admin/reservations/${reservation.id}`;
  const subject = `Neue Reservierungsanfrage: ${date}, ${time}, ${reservation.partySize} Personen`;
  const rows: Array<[string, string]> = [
    ['Name', reservation.name],
    ['Telefon', reservation.phone],
    ['Datum', date],
    ['Uhrzeit', time],
    ['Personen', String(reservation.partySize)],
    ['Referenz', reservation.publicId],
  ];
  if (reservation.comment) rows.push(['Anmerkung', reservation.comment]);
  const intro = 'Es ist eine neue Reservierungsanfrage eingegangen.';
  const text = `${intro}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nAnfrage bearbeiten: ${link}\n`;
  const html = layout(
    `${escapeHtml(intro)}`,
    `${detailsTable(rows)}<p><a href="${escapeHtml(link)}" style="color:${BRAND_GREEN};">Anfrage bearbeiten</a></p>`,
  );
  return { subject, text, html };
}
