import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './router';

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('home page', () => {
  it('redirects / to German', async () => {
    const router = renderAt('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Peruanische Küche mitten in Bremen' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/de');
  });

  it('renders Spanish under /es with localized navigation', async () => {
    renderAt('/es');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cocina peruana en pleno Bremen' }),
    ).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Navegación principal' })[0]!;
    expect(within(nav).getByRole('link', { name: 'Carta' })).toHaveAttribute('href', '/es/carta');
    expect(within(nav).getByRole('link', { name: 'Contacto' })).toHaveAttribute(
      'href',
      '/es/contacto',
    );
  });

  it('links imprint and privacy from the footer', async () => {
    renderAt('/de');

    const footer = await screen.findByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Impressum' })).toHaveAttribute(
      'href',
      '/de/impressum',
    );
    expect(within(footer).getByRole('link', { name: 'Datenschutz' })).toHaveAttribute(
      'href',
      '/de/datenschutz',
    );
  });

  it('offers a skip link to the main content', async () => {
    renderAt('/de');

    expect(await screen.findByRole('link', { name: 'Zum Inhalt springen' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(document.getElementById('main')).toBeInTheDocument();
  });
});
