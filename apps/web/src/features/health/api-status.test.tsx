import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiStatus } from './api-status';

// Moved from app.test.tsx in M1: the public home no longer shows the API status.
function renderStatus() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ApiStatus />
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

describe('ApiStatus', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the API as connected', async () => {
    mockHealth(true);
    renderStatus();
    expect(await screen.findByText(/Verbunden/)).toBeInTheDocument();
  });

  it('shows a skeleton loader while loading', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}));
    renderStatus();

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByTestId('skeleton')).toHaveLength(2);
    expect(status).toHaveTextContent('Wird geprüft');
  });

  it('treats an invalid payload as an error (Zod validation)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ status: 'hacked', injected: '<script>alert(1)</script>' }),
    );
    renderStatus();
    expect(await screen.findByText(/Nicht erreichbar/)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('shows an error state when the API is down', async () => {
    mockHealth(false);
    renderStatus();
    expect(await screen.findByText(/Nicht erreichbar/)).toBeInTheDocument();
  });
});
