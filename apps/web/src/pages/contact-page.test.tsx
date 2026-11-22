import { RESTAURANT_INFO } from '@pachamama/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { ContactPage } from './contact-page';

function renderPage() {
  render(<ContactPage />, { wrapper: MemoryRouter });
}

beforeEach(async () => {
  await i18n.changeLanguage('de');
});

describe('contact page', () => {
  it('renders heading, address, hours, phone and email', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Kontakt und Anfahrt' })).toBeVisible();
    expect(screen.getByText(/Am Gaswerk 1/).closest('address')).not.toBeNull();
    expect(screen.getByText(RESTAURANT_INFO.openingHours.de)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: RESTAURANT_INFO.phone.display })).toHaveAttribute(
      'href',
      `tel:${RESTAURANT_INFO.phone.e164}`,
    );
    expect(screen.getByRole('link', { name: RESTAURANT_INFO.email })).toHaveAttribute(
      'href',
      `mailto:${RESTAURANT_INFO.email}`,
    );
    expect(screen.getByText(/Bahnhofs Bremen-Neustadt/)).toBeInTheDocument();
  });

  it('shows the local static map with attribution', () => {
    renderPage();
    const map = screen.getByRole('img', { name: /Karte der Umgebung/ });
    expect(map).toHaveAttribute('src', '/images/map/kontakt-karte.webp');
    expect(screen.getByRole('link', { name: /OpenStreetMap-Mitwirkende/ })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    );
  });

  it('opens external map links in a new tab with an accessible hint', () => {
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
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Contacto y cómo llegar' })).toBeVisible();
    expect(screen.getByText(RESTAURANT_INFO.openingHours.es)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /colaboradores de OpenStreetMap/ })).toBeVisible();
    expect(screen.getByRole('link', { name: /Abrir en Google Maps/ })).toBeVisible();
  });
});
