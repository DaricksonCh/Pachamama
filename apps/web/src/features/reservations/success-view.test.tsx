import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { formatLocalTime } from './dates';
import { SuccessView } from './success-view';

// 18:00 UTC is 19:00 in Europe/Berlin (CET).
const confirmation = {
  publicId: 'p',
  startsAt: '2026-11-25T18:00:00.000Z',
  partySize: 4,
};

/** Locales of the Intl.DateTimeFormat instances that format a time of day. */
function spyLocales() {
  const Original = Intl.DateTimeFormat;
  const locales: unknown[] = [];
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
    this: unknown,
    ...args: ConstructorParameters<typeof Intl.DateTimeFormat>
  ) {
    if (args[1]?.hour) locales.push(args[0]);
    return new Original(...args);
  } as never);
  return locales;
}

describe('formatLocalTime', () => {
  it('shows the restaurant-local time, whatever the browser zone', () => {
    expect(formatLocalTime(confirmation.startsAt, 'de')).toBe('19:00');
    expect(formatLocalTime(confirmation.startsAt, 'es')).toBe('19:00');
  });
});

describe('SuccessView', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage('de');
  });

  it('formats the date and time with the current language, not a fixed locale', () => {
    const locales = spyLocales();
    render(<SuccessView confirmation={confirmation} headingRef={null} />, {
      wrapper: MemoryRouter,
    });
    expect(screen.getByText('19:00')).toBeVisible();
    expect(locales.length).toBeGreaterThan(0);
    expect(locales).toEqual(['es']);
  });
});
