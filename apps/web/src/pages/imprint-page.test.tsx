import { RESTAURANT_INFO } from '@pachamama/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { ImprintPage } from './imprint-page';

function renderPage() {
  return render(<ImprintPage />, { wrapper: MemoryRouter });
}

beforeEach(async () => {
  await i18n.changeLanguage('de');
});

describe('imprint page', () => {
  it('renders the German headings and the legal fields', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Impressum' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Angaben gemäß § 5 DDG' })).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Verbraucherstreitbeilegung' }),
    ).toBeVisible();
    expect(screen.getByText(/Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG/)).toBeVisible();
    expect(screen.getByText(/§ 18 Abs. 2 MStV/)).toBeVisible();
    expect(screen.getByText(/§ 36 VSBG/)).toBeVisible();
    expect(screen.getByText(/Am Gaswerk 1/).closest('address')).not.toBeNull();
  });

  it('shows the provisional note and visible placeholders while legal data is pending', () => {
    renderPage();
    expect(RESTAURANT_INFO.provisionalFields).toContain('legal');
    expect(screen.getByRole('note')).toHaveTextContent(/vorläufig/);
    expect(screen.getAllByText('[ausstehend]').length).toBeGreaterThanOrEqual(5);
  });

  it('links phone and email', () => {
    renderPage();
    expect(screen.getByRole('link', { name: RESTAURANT_INFO.phone.display })).toHaveAttribute(
      'href',
      `tel:${RESTAURANT_INFO.phone.e164}`,
    );
    expect(screen.getByRole('link', { name: RESTAURANT_INFO.email })).toHaveAttribute(
      'href',
      `mailto:${RESTAURANT_INFO.email}`,
    );
  });

  it('renders in Spanish as a labelled translation', async () => {
    await i18n.changeLanguage('es');
    const { container } = renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Aviso legal' })).toBeVisible();
    expect(screen.getByText(/Traducción de cortesía/)).toBeVisible();
    expect(screen.getByRole('note')).toHaveTextContent(/provisional/);
    expect(screen.getAllByText('[pendiente]').length).toBeGreaterThanOrEqual(5);
    expect(container.querySelector('iframe, script')).toBeNull();
  });

  it('embeds nothing external', () => {
    const { container } = renderPage();
    expect(container.querySelector('iframe, script, [src^="http"]')).toBeNull();
  });
});
