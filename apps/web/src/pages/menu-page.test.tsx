import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { MenuPage } from './menu-page';

const menu = {
  categories: [
    {
      id: 1,
      nameDe: 'Vorspeisen',
      nameEs: 'Entradas',
      descriptionDe: 'Zum Teilen',
      descriptionEs: 'Para compartir',
      dishes: [
        {
          id: 10,
          nameDe: 'Ceviche klassisch',
          nameEs: 'Ceviche clásico',
          descriptionDe: 'Fisch mit Limette',
          descriptionEs: 'Pescado con limón',
          price: 12.9,
          diet: null,
          allergens: ['D', 'G'],
          image: null,
        },
        {
          id: 11,
          nameDe: 'Causa',
          nameEs: 'Causa limeña',
          descriptionDe: null,
          descriptionEs: null,
          price: 8.5,
          diet: 'vegan',
          allergens: [],
          image: {
            url: {
              w400: '/uploads/a-400.webp',
              w800: '/uploads/a-800.webp',
              w1600: '/uploads/a-1600.webp',
            },
            altDe: 'Causa',
            altEs: 'Causa',
          },
        },
      ],
    },
    {
      id: 2,
      nameDe: 'Desserts',
      nameEs: 'Postres',
      descriptionDe: null,
      descriptionEs: null,
      dishes: [],
    },
  ],
};

function respond(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MenuPage />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('de');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('public menu page', () => {
  it('shows a loading skeleton first', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    renderPage();

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('Speisekarte wird geladen');
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('renders categories, German prices and allergen names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respond({ data: menu })),
    );
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Vorspeisen' }),
    ).toBeInTheDocument();
    // Empty categories are not shown.
    expect(screen.queryByRole('heading', { name: 'Desserts' })).not.toBeInTheDocument();
    expect(screen.getByText(/12,90/)).toBeInTheDocument();
    const dish = screen.getByRole('heading', { name: 'Ceviche klassisch' }).closest('li')!;
    const allergens = within(dish).getByRole('list', { name: 'Allergene' });
    expect(within(allergens).getByText('Fisch')).toBeInTheDocument();
    expect(within(allergens).getByText('Milch und Laktose')).toBeInTheDocument();
    expect(screen.getByText('Vegan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vorspeisen' })).toHaveAttribute('href', '#category-1');
    expect(screen.getByText(/Fragen zu Allergenen/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Speisekarte als PDF/ })).toHaveAttribute(
      'href',
      '/api/v1/menu/pdf?lang=de',
    );
  });

  it('renders Spanish text and prices', async () => {
    await i18n.changeLanguage('es');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respond({ data: menu })),
    );
    renderPage();

    expect(await screen.findByRole('heading', { level: 2, name: 'Entradas' })).toBeInTheDocument();
    expect(screen.getByText(/12,90/)).toBeInTheDocument();
    const dish = screen.getByRole('heading', { name: 'Ceviche clásico' }).closest('li')!;
    expect(within(dish).getByText('Pescado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Carta en PDF/ })).toHaveAttribute(
      'href',
      '/api/v1/menu/pdf?lang=es',
    );
  });

  it('shows a friendly empty state with the PDF link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respond({ data: { categories: [] } })),
    );
    renderPage();

    expect(await screen.findByText(/wird gerade aktualisiert/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Speisekarte als PDF/ })).toHaveLength(2);
  });

  it('shows an error and recovers with retry', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => respond({ error: { code: 'INTERNAL' } }, 500))
      .mockImplementation(() => respond({ data: menu }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('konnte nicht geladen werden');
    await userEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    expect(await screen.findByRole('heading', { name: 'Vorspeisen' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('treats an invalid payload as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respond({ data: { categories: [{ id: 'x' }] } })),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('konnte nicht geladen werden');
  });
});
