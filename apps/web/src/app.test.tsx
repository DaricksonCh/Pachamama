import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from './router';

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function mockHealth(ok: boolean) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    ok
      ? Response.json({
          status: 'ok',
          service: 'pachamama-api',
          version: '0.0.0',
          timestamp: new Date().toISOString(),
        })
      : new Response(null, { status: 503 }),
  );
}

describe('home page', () => {
  it('redirects / to German and shows the API as connected', async () => {
    mockHealth(true);
    renderAt('/');

    expect(
      await screen.findByRole('heading', { name: 'Willkommen bei Pachamama' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Verbunden/)).toBeInTheDocument();
  });

  it('renders Spanish under /es', async () => {
    mockHealth(true);
    renderAt('/es');

    expect(
      await screen.findByRole('heading', { name: 'Bienvenidos a Pachamama' }),
    ).toBeInTheDocument();
  });

  it('shows a skeleton loader while the API status is loading', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}));
    renderAt('/de');

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByTestId('skeleton')).toHaveLength(2);
    expect(status).toHaveTextContent('Wird geprüft');
  });

  it('shows an error state when the API is down', async () => {
    mockHealth(false);
    renderAt('/de');

    expect(await screen.findByText(/Nicht erreichbar/)).toBeInTheDocument();
  });
});
