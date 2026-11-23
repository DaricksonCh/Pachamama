import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { StoryPage } from './story-page';

function renderPage() {
  render(<StoryPage />, { wrapper: MemoryRouter });
}

beforeEach(async () => {
  await i18n.changeLanguage('de');
});

describe('story page', () => {
  it('renders the blocks in order with the placeholder note', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Unsere Geschichte' })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Rezepte aus Familienhand',
      'Ein Team, ein Zuhause',
      'Was unser Name bedeutet',
      'Peru, ohne Abkürzungen',
      'Kommen Sie vorbei',
      'Einblicke',
    ]);
    expect(screen.getByRole('note')).toHaveTextContent(/Platzhalter/);
    expect(screen.getByText('01 · Der Ursprung')).toBeInTheDocument();
  });

  it('explains the name with the Quechua words marked', () => {
    renderPage();
    const pacha = screen.getByText('Pacha');
    expect(pacha).toHaveAttribute('lang', 'qu');
    expect(pacha.parentElement).toHaveTextContent('Pacha = Erde · Mama = Mutter');
  });

  it('shows described photos and links to the menu and reservation', () => {
    renderPage();
    expect(screen.getByRole('img', { name: /Porträt einer Köchin/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Team des Restaurants/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Tamal/ })).toBeInTheDocument();
    for (const img of screen.getAllByRole('img')) expect(img).toHaveAccessibleName();
    expect(screen.getByRole('link', { name: 'Zur Speisekarte' })).toHaveAttribute(
      'href',
      '/de/speisekarte',
    );
    expect(screen.getByRole('link', { name: /Tisch reservieren/ })).toBeInTheDocument();
  });

  it('renders in Spanish', async () => {
    await i18n.changeLanguage('es');
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Nuestra historia' })).toBeVisible();
    expect(screen.getByRole('note')).toHaveTextContent(/provisional/);
    expect(screen.getByText('nos vemos, familia')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la carta' })).toHaveAttribute('href', '/es/carta');
  });
});
