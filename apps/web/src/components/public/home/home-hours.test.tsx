import { RESTAURANT_INFO } from '@pachamama/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { HomeHours } from './home-hours';

const WEEK = [2, 3, 4, 5, 6, 0].map((weekday) => ({ weekday, opens: '13:00', closes: '22:00' }));

function mockHours(data: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => Response.json(status === 200 ? { data } : {}, { status }));
}

function renderAt(utc: string, path = '/es') {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(utc) });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <HomeHours />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('home opening hours', () => {
  it('says it is open now and until when, with a one-line weekly summary', async () => {
    mockHours({ hours: WEEK, closures: [] });
    // Tuesday 2026-11-24, 14:00 in Bremen.
    renderAt('2026-11-24T13:00:00Z');

    expect(await screen.findByTestId('home-opening-status')).toHaveTextContent(
      'Abierto ahora · hasta las 22:00',
    );
    const summary = screen.getByTestId('home-hours-summary');
    expect(
      within(summary)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Mar–Dom 13:00–22:00', 'Lun cerrado']);
    // The week strip marks today (Tuesday) and the rest day (Monday); it is hidden from AT.
    const week = screen.getByTestId('home-week');
    expect(week).toHaveAttribute('aria-hidden', 'true');
    const days = week.querySelectorAll('li');
    expect(days).toHaveLength(7);
    expect(days[1]).toHaveAttribute('data-today');
    expect(days[0]).toHaveAttribute('data-rest');
  });

  it('on the rest day says when it opens next', async () => {
    mockHours({ hours: WEEK, closures: [] });
    // Monday 2026-11-23, 15:00 in Bremen.
    renderAt('2026-11-23T14:00:00Z');
    expect(await screen.findByTestId('home-opening-status')).toHaveTextContent(
      'Hoy descansamos · mañana desde las 13:00',
    );
  });

  it('in German, after closing time, names the next day', async () => {
    await i18n.changeLanguage('de');
    mockHours({ hours: WEEK, closures: [{ from: '2026-11-25', to: '2026-11-25' }] });
    // Tuesday 23:00 in Bremen; Wednesday is closed, so Thursday comes next.
    renderAt('2026-11-24T22:00:00Z', '/de');
    expect(await screen.findByTestId('home-opening-status')).toHaveTextContent(
      'Gerade geschlossen · Donnerstag ab 13:00 Uhr',
    );
    // The closure ahead shows as a short note.
    expect(screen.getByText('Geschlossen vom 25. November bis 25. November')).toBeVisible();
  });

  it('during a closure says until when', async () => {
    mockHours({ hours: WEEK, closures: [{ from: '2026-12-22', to: '2026-12-26' }] });
    renderAt('2026-12-23T13:00:00Z');
    expect(await screen.findByTestId('home-opening-status')).toHaveTextContent(
      'Cerrado hasta el 26 de diciembre incluido',
    );
  });

  it('falls back to the fixed text when the API fails', async () => {
    mockHours(null, 500);
    renderAt('2026-11-24T13:00:00Z');
    expect(await screen.findByText(RESTAURANT_INFO.openingHours.es)).toBeVisible();
  });
});
