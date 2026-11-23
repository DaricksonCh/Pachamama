import { RESTAURANT_INFO } from '@pachamama/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { ContactPage } from './contact-page';

const HOURS = {
  hours: [
    { weekday: 2, opens: '12:00', closes: '15:00' },
    { weekday: 2, opens: '18:00', closes: '22:00' },
    ...[3, 4, 5, 6, 0].map((weekday) => ({ weekday, opens: '13:00', closes: '22:00' })),
  ],
  closures: [],
};

function mockHours(response: () => Response = () => Response.json({ data: HOURS })) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response());
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(<ContactPage />, { wrapper });
}

beforeEach(async () => {
  await i18n.changeLanguage('de');
  // Tuesday 2026-11-24, 13:30 in Bremen (12:30 UTC): inside the lunch shift.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-24T12:30:00Z') });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('contact page', () => {
  it('renders the postcard with heading and the real address', () => {
    mockHours();
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Kontakt und Anfahrt' })).toBeVisible();
    const address = screen.getByText(/Am Gaswerk 1/).closest('address');
    expect(address).not.toBeNull();
    expect(address).toHaveTextContent('28197 Bremen');
  });

  it('lists the hours from the API, with split shifts, the rest day and today', async () => {
    const fetchSpy = mockHours();
    renderPage();
    expect(await screen.findByText('12:00–15:00, 18:00–22:00')).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/opening-hours', expect.anything());
    const monday = screen.getByText('Montag');
    expect(monday.nextElementSibling).toHaveTextContent('Ruhetag');
    expect(screen.getByText('Dienstag')).toHaveClass('text-maiz');
  });

  it('says whether the restaurant is open right now', async () => {
    mockHours();
    renderPage();
    expect(await screen.findByTestId('opening-status')).toHaveTextContent(
      'Jetzt geöffnet – bis 15:00 Uhr',
    );
  });

  it('announces a closure that covers today', async () => {
    mockHours(() =>
      Response.json({ data: { ...HOURS, closures: [{ from: '2026-11-20', to: '2026-11-30' }] } }),
    );
    renderPage();
    expect(await screen.findByTestId('opening-status')).toHaveTextContent(
      'Geschlossen bis einschließlich 30. November',
    );
  });

  it('draws one knot per open hour on each cord and hides the drawing from screen readers', async () => {
    mockHours();
    renderPage();
    await screen.findByText('12:00–15:00, 18:00–22:00');
    const quipu = screen.getByTestId('quipu');
    expect(quipu).toHaveAttribute('aria-hidden', 'true');
    const knots = (weekday: number) =>
      quipu.querySelector(`[data-weekday="${weekday}"]`)?.getAttribute('data-knots');
    expect(knots(1)).toBe('0'); // Monday: rest day
    expect(knots(2)).toBe('7'); // 12–15 + 18–22
    expect(knots(3)).toBe('9'); // 13–22
    expect(within(quipu).getByText('Ruhetag')).toBeInTheDocument();
  });

  it('falls back to the fixed hours text if the API fails', async () => {
    mockHours(() => Response.json({ error: { code: 'INTERNAL' } }, { status: 500 }));
    renderPage();
    expect(await screen.findByText(RESTAURANT_INFO.openingHours.de)).toBeVisible();
    expect(screen.queryByTestId('quipu')).toBeNull();
  });

  it('links the confirmed phone and email', () => {
    mockHours();
    renderPage();
    expect(
      screen.getByRole('link', {
        name: (n) => n.startsWith('Telefon:') && n.endsWith(RESTAURANT_INFO.phone.display),
      }),
    ).toHaveAttribute('href', `tel:${RESTAURANT_INFO.phone.e164}`);
    expect(
      screen.getByRole('link', {
        name: (n) => n.startsWith('E-Mail:') && n.endsWith(RESTAURANT_INFO.email),
      }),
    ).toHaveAttribute('href', `mailto:${RESTAURANT_INFO.email}`);
    expect(screen.queryByText('(vorläufig)')).toBeNull();
  });

  it('shows the local static map with attribution and directions', () => {
    mockHours();
    renderPage();
    const map = screen.getByRole('img', { name: /Karte der Umgebung/ });
    expect(map).toHaveAttribute('src', '/images/map/kontakt-karte.webp');
    expect(screen.getByRole('link', { name: /OpenStreetMap-Mitwirkende/ })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    );
    expect(screen.getByText(/Bahnhofs Bremen-Neustadt/)).toBeInTheDocument();
  });

  it('opens external map links in a new tab with an accessible hint', () => {
    mockHours();
    renderPage();
    const google = screen.getByRole('link', { name: /In Google Maps öffnen/ });
    const osm = screen.getByRole('link', { name: /In OpenStreetMap öffnen/ });
    expect(google).toHaveAttribute('href', expect.stringContaining('google.com/maps/search'));
    expect(osm).toHaveAttribute('href', expect.stringContaining('mlat=53.0753555'));
    for (const link of [google, osm]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAccessibleName(/öffnet in neuem Tab/);
    }
  });

  it('renders in Spanish', async () => {
    await i18n.changeLanguage('es');
    mockHours();
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Contacto y cómo llegar' })).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Cuándo cocinamos para ti' }),
    ).toBeVisible();
    expect(await screen.findByTestId('opening-status')).toHaveTextContent(
      'Abierto ahora, hasta las 15:00',
    );
    expect(screen.getByText('lunes').nextElementSibling).toHaveTextContent('Descanso');
    expect(screen.getByRole('link', { name: /Abrir en Google Maps/ })).toBeVisible();
  });
});
