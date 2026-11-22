import { RESTAURANT_INFO } from '@pachamama/shared';
import { describe, expect, it } from 'vitest';
import { buildDecisionEmail, buildStaffNotification } from './emails';

const startsAt = new Date('2026-11-27T18:30:00Z');
const reservation = { startsAt, partySize: 4, name: 'Ana' };

const fmt = (locale: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { timeZone: 'Europe/Berlin', ...o }).format(startsAt);
const dateOf = (locale: string) =>
  fmt(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeOf = (locale: string) =>
  fmt(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const build = (over: Partial<Parameters<typeof buildDecisionEmail>[0]> = {}) =>
  buildDecisionEmail({
    kind: 'confirmed',
    lang: 'de',
    subject: 'Betreff',
    body: 'Hallo',
    reservation,
    ...over,
  });

describe('buildDecisionEmail', () => {
  it('escapes HTML in the html part and keeps text intact', () => {
    const r = build({ body: '<script>alert(1)</script>' });
    expect(r.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(r.html).not.toContain('<script>');
    expect(r.text).toContain('<script>alert(1)</script>');
  });

  it('turns newlines into <br> in html', () => {
    const r = build({ body: 'Zeile 1\nZeile 2' });
    expect(r.html).toContain('Zeile 1<br>Zeile 2');
    expect(r.text).toContain('Zeile 1\nZeile 2');
  });

  it('formats date and time in Europe/Berlin for de and es', () => {
    const de = build({ lang: 'de' });
    const es = build({ lang: 'es' });
    expect(de.text).toContain(dateOf('de-DE'));
    expect(de.text).toContain(timeOf('de-DE'));
    expect(es.text).toContain(dateOf('es-ES'));
    expect(es.text).toContain(timeOf('es-ES'));
    expect(timeOf('de-DE')).toBe('19:30');
    expect(de.html).toContain(dateOf('de-DE'));
  });

  it('escapes & " and \' in html', () => {
    const r = build({ body: 'a & b "c" \'d\'' });
    expect(r.html).toContain('a &amp; b &quot;c&quot; &#39;d&#39;');
  });

  it('includes party size, address and subject', () => {
    const r = build();
    expect(r.subject).toBe('Betreff');
    expect(r.text).toContain('4');
    expect(r.text).toContain(RESTAURANT_INFO.address.street);
    expect(r.html).toContain(RESTAURANT_INFO.address.city);
  });
});

describe('buildStaffNotification', () => {
  const r = buildStaffNotification(
    {
      publicId: 'abc123',
      id: 42,
      startsAt,
      partySize: 2,
      name: '<b>Eva</b>',
      phone: '+49 1',
      comment: null,
    },
    'https://example.org',
  );

  it('links to the admin reservation and is in German', () => {
    expect(r.text).toContain('https://example.org/admin/reservations/42');
    expect(r.html).toContain('https://example.org/admin/reservations/42');
    expect(r.text).toContain(dateOf('de-DE'));
  });

  it('escapes a multi-line comment and renders newlines as <br>', () => {
    const c = buildStaffNotification(
      {
        publicId: 'p',
        id: 1,
        startsAt,
        partySize: 2,
        name: 'Eva',
        phone: '1',
        comment: '<b>&"\'\nzwei',
      },
      'https://example.org',
    );
    expect(c.html).toContain('&lt;b&gt;&amp;&quot;&#39;<br>zwei');
    expect(c.text).toContain('<b>&"\'\nzwei');
  });

  it('escapes personal data in html', () => {
    expect(r.html).toContain('&lt;b&gt;Eva&lt;/b&gt;');
    expect(r.html).not.toContain('<b>Eva');
  });
});
