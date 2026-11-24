import { RESTAURANT_INFO } from '@pachamama/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it("says it is open now and until when, and shows only today's hours at first", async () => {
    mockHours({ hours: WEEK, closures: [] });
    // Tuesday 2026-11-24, 14:00 in Bremen.
    renderAt('2026-11-24T13:00:00Z');

    expect(await screen.findByTestId('home-opening-status')).toHaveTextContent(
      'Abierto ahora · hasta las 22:00',
    );
    // No whole-week list any more: the day buttons are the way to see the other days.
    expect(screen.queryByTestId('home-hours-summary')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mar–Dom/)).not.toBeInTheDocument();
    // The week strip marks today (Tuesday) and the rest day (Monday), and today starts chosen.
    const days = within(
      screen.getByRole('group', { name: 'Ver el horario de un día' }),
    ).getAllByRole('button');
    expect(days).toHaveLength(7);
    expect(days[1]).toHaveAttribute('data-today');
    expect(days[1]).toHaveAttribute('aria-pressed', 'true');
    expect(days[0]).toHaveAttribute('data-rest');
    expect(screen.getByTestId('home-day-hours')).toHaveTextContent('Hoy, martes · 13:00–22:00');
  });

  it('shows the hours of any day the visitor picks', async () => {
    mockHours({
      hours: [
        ...WEEK.filter((r) => r.weekday !== 5),
        { weekday: 5, opens: '12:00', closes: '23:00' },
      ],
      closures: [{ from: '2026-11-26', to: '2026-11-26' }],
    });
    // Tuesday 2026-11-24, 14:00 in Bremen.
    renderAt('2026-11-24T13:00:00Z');
    await screen.findByTestId('home-opening-status');
    const detail = screen.getByTestId('home-day-hours');

    fireEvent.click(screen.getByRole('button', { name: 'viernes' }));
    expect(detail).toHaveTextContent('Viernes · 12:00–23:00');
    expect(screen.getByRole('button', { name: 'viernes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'martes' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'lunes' }));
    expect(detail).toHaveTextContent('Lunes · cerrado');

    // Thursday falls on a closure this week.
    fireEvent.click(screen.getByRole('button', { name: 'jueves' }));
    expect(detail).toHaveTextContent('Jueves · cerrado (26 de noviembre)');
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
