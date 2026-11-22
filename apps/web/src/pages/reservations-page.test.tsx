import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { ReservationsPage } from './reservations-page';

function renderPage() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    Response.json({ data: { days: [], partyMin: 1, partyMax: 8, sameDayOnline: false } }),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReservationsPage />
    </QueryClientProvider>,
    { wrapper: MemoryRouter },
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('de');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('reservations page', () => {
  it('renders the title and sets the document title in German', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Tisch reservieren' })).toBeVisible();
    expect(document.title).toBe('Tisch reservieren – Pachamama');
    expect(await screen.findByRole('radio', { name: '2 Personen' })).toBeVisible();
  });

  it('renders in Spanish', async () => {
    await i18n.changeLanguage('es');
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Reservar mesa' })).toBeVisible();
    expect(document.title).toBe('Reservar mesa – Pachamama');
    expect(await screen.findByRole('radio', { name: '2 personas' })).toBeVisible();
  });
});
