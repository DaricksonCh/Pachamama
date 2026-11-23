import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { HomeKitchen } from './home-kitchen';

const dish = (id: number, nameDe: string, nameEs: string, price: number) => ({
  id,
  nameDe,
  nameEs,
  descriptionDe: null,
  descriptionEs: null,
  price,
  diet: null,
  allergens: [],
  image: null,
});

const menu = {
  categories: [
    {
      id: 1,
      nameDe: 'Hauptgerichte',
      nameEs: 'Platos principales',
      descriptionDe: null,
      descriptionEs: null,
      dishes: [
        dish(1, 'Ceviche Clásico', 'Ceviche clásico', 19.9),
        // Case differs from the featured name on purpose: matching ignores case.
        dish(2, 'Lomo saltado de carne o pollo', 'Lomo saltado de carne o pollo', 21),
      ],
    },
  ],
};

function renderSection(path = '/de') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <HomeKitchen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const card = (key: string) => screen.getByTestId(`kitchen-dish-${key}`);

beforeEach(async () => {
  await i18n.changeLanguage('de');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('home kitchen section', () => {
  it('shows the three classics with prices from the live menu', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ data: menu })))),
    );
    renderSection();

    expect(screen.getByRole('heading', { level: 2, name: 'Lorem ipsum dolor' })).toBeVisible();
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Ceviche Clásico', 'Lomo Saltado', 'Causa Limeña']);

    expect(await within(card('ceviche')).findByText('19,90 €')).toBeInTheDocument();
    expect(within(card('lomo')).getByText('21,00 €')).toBeInTheDocument();
    // Causa is not in this menu: its card stays, without a price.
    expect(within(card('causa')).queryByText(/€/)).not.toBeInTheDocument();
    // Each card opens the menu; its link is named after the dish.
    for (const name of ['Ceviche Clásico', 'Lomo Saltado', 'Causa Limeña']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', '/de/speisekarte');
    }
    expect(screen.getByRole('link', { name: 'Zur ganzen Speisekarte' })).toHaveAttribute(
      'href',
      '/de/speisekarte',
    );
  });

  it('still shows the dishes when the menu cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 500 }))),
    );
    renderSection();

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });
});
