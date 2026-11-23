import { RESTAURANT_INFO } from '@pachamama/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { PrivacyPage } from './privacy-page';

function renderPage() {
  return render(<PrivacyPage />, { wrapper: MemoryRouter });
}

const AUTHORITY =
  'Die Landesbeauftragte für Datenschutz und Informationsfreiheit der Freien Hansestadt Bremen';

beforeEach(async () => {
  await i18n.changeLanguage('de');
});

describe('privacy page', () => {
  it('renders the German headings in logical order', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' })).toBeVisible();
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      'Überblick',
      'Verantwortlicher',
      'Hosting und Server-Logfiles',
      'Cookies',
      'Schriftarten, Bilder und externe Dienste',
      'Kontakt per Telefon oder E-Mail',
      'Tischreservierungen',
      'Ihre Rechte',
      'Beschwerderecht bei der Aufsichtsbehörde',
      'Stand',
    ]);
  });

  it('shows the provisional note and pending hosting data', () => {
    renderPage();
    expect(screen.getByRole('note')).toHaveTextContent(/Entwurf/);
    expect(screen.getByText(/Hosting-Anbieter: \[ausstehend\]/)).toBeVisible();
    expect(screen.getByText(/Speicherdauer der Logfiles: \[ausstehend\]/)).toBeVisible();
  });

  it('names the supervisory authority, the date and the legal bases', () => {
    renderPage();
    expect(screen.getByText(AUTHORITY)).toBeVisible();
    expect(screen.getByText(/Stand: 23. November 2026/)).toBeVisible();
    expect(screen.getByText(/§ 25 Abs. 2 Nr. 2 TDDDG/)).toBeVisible();
    expect(screen.getByText(/Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes/)).toBeVisible();
  });

  it('describes the reservations processing', () => {
    renderPage();
    expect(
      screen.getByText(/Name, E-Mail-Adresse, Telefonnummer, optional eine Anmerkung/),
    ).toBeVisible();
    expect(screen.getByText(/lit. b DSGVO \(vorvertragliche/)).toBeVisible();
    expect(screen.getByText(/Spätestens 90 Tage nach dem Reservierungsdatum/)).toBeVisible();
    expect(screen.getByText(/Anbieter: \[ausstehend\]\. Mit ihm/)).toBeVisible();
    expect(screen.getByText(/keine Cookies und kein Tracking/)).toBeVisible();
  });

  it('states the legal requirement, comment advice, retention and AVV obligation', () => {
    renderPage();
    expect(screen.getByText(/ohne sie ist keine Reservierung möglich/)).toBeVisible();
    expect(screen.getByText(/nur das Nötigste ein \(zum Beispiel Allergien\)/)).toBeVisible();
    expect(screen.getByText(/in der Datenbank unwiderruflich/)).toBeVisible();
    expect(screen.getByText(/Aufbewahrungsfrist: \[ausstehend\]/)).toBeVisible();
    expect(screen.getByText(/Auftragsverarbeitungsvertrag geschlossen/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Ihre Rechte \(Auskunft/ })).toHaveAttribute(
      'href',
      '#privacy-rights',
    );
  });

  it('links phone, email and the imprint', () => {
    renderPage();
    expect(screen.getByRole('link', { name: RESTAURANT_INFO.phone.display })).toHaveAttribute(
      'href',
      `tel:${RESTAURANT_INFO.phone.e164}`,
    );
    expect(screen.getByRole('link', { name: RESTAURANT_INFO.email })).toHaveAttribute(
      'href',
      `mailto:${RESTAURANT_INFO.email}`,
    );
    expect(screen.getByRole('link', { name: /im Impressum/ })).toHaveAttribute(
      'href',
      '/de/impressum',
    );
  });

  it('renders in Spanish as a labelled translation', async () => {
    await i18n.changeLanguage('es');
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible();
    expect(screen.getByText(/Traducción de cortesía/)).toBeVisible();
    expect(screen.getByRole('note')).toHaveTextContent(/borrador/);
    expect(screen.getByText(AUTHORITY)).toBeVisible();
    expect(screen.getByText(/Proveedor de alojamiento: \[pendiente\]/)).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Reservas de mesa' })).toBeVisible();
    expect(screen.getByText(/Proveedor: \[pendiente\]\. Con él se celebrará/)).toBeVisible();
    expect(screen.getByText(/como máximo 90 días después/)).toBeVisible();
    expect(screen.getByRole('link', { name: /aviso legal/ })).toHaveAttribute(
      'href',
      '/es/aviso-legal',
    );
  });

  it('embeds nothing external', () => {
    const { container } = renderPage();
    expect(container.querySelector('iframe, script, [src^="http"]')).toBeNull();
  });
});
