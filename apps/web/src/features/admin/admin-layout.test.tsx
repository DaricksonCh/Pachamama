import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { routes } from '@/router';

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('@/lib/auth-client', () => ({
  authClient: { signOut, signIn: { email: vi.fn() } },
}));

const USER = { id: 'u1', name: 'Ana Admin', email: 'ana@pachamama.test', role: 'admin' };
const SUMMARY = {
  visibleDishes: 48,
  hiddenDishes: 3,
  provisionalDishes: 6,
  dishesWithoutImage: 37,
  categories: 9,
};

type Handler = () => Response | Promise<Response>;

/** Responde por ruta; lo no registrado devuelve 404. */
function mockApi(handlers: Record<string, Handler>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://localhost');
    const handler = handlers[url.pathname];
    return handler ? handler() : new Response(null, { status: 404 });
  });
}

function renderAt(path: string) {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('AdminLayout', () => {
  it('shows the side navigation with the menu section and a PDF link in the current language', async () => {
    mockApi({
      '/api/v1/me': () => Response.json({ data: USER }),
      '/api/v1/admin/menu/summary': () => Response.json({ data: SUMMARY }),
    });
    renderAt('/admin');

    const nav = await screen.findByRole('navigation', { name: 'Navegación principal' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/admin');
    expect(within(nav).getByRole('link', { name: 'Categorías' })).toHaveAttribute(
      'href',
      '/admin/menu/categories',
    );
    expect(within(nav).getByRole('link', { name: 'Platos' })).toHaveAttribute(
      'href',
      '/admin/menu/dishes',
    );
    const pdf = within(nav).getByRole('link', { name: /PDF/ });
    expect(pdf).toHaveAttribute('href', '/api/v1/menu/pdf?lang=es');
    expect(pdf).toHaveAttribute('target', '_blank');
    expect(pdf).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText('Ana Admin (Administrador)')).toBeInTheDocument();
  });

  it('redirects to the login with a next parameter when there is no session', async () => {
    mockApi({ '/api/v1/me': () => new Response(null, { status: 401 }) });
    const router = renderAt('/admin/menu/dishes');

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Fmenu%2Fdishes');
  });

  it('redirects to the login when a data request answers 401 (expired session)', async () => {
    mockApi({
      '/api/v1/me': () => Response.json({ data: USER }),
      '/api/v1/admin/menu/summary': () => new Response(null, { status: 401 }),
    });
    const router = renderAt('/admin');

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
  });

  it('rechecks the session on navigation and goes to the login when it is gone', async () => {
    let signedIn = true;
    mockApi({
      '/api/v1/me': () =>
        signedIn ? Response.json({ data: USER }) : new Response(null, { status: 401 }),
      '/api/v1/admin/menu/summary': () => Response.json({ data: SUMMARY }),
    });
    const router = renderAt('/admin');
    const nav = await screen.findByRole('navigation', { name: 'Navegación principal' });

    signedIn = false;
    await userEvent.click(within(nav).getByRole('link', { name: 'Platos' }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Fmenu%2Fdishes');
  });

  it('shows a loading skeleton while the session is checked', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}));
    renderAt('/admin');

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an error with retry when the session check fails', async () => {
    mockApi({ '/api/v1/me': () => new Response(null, { status: 500 }) });
    renderAt('/admin');

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el panel');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('tells the user when sign-out fails and keeps them in the panel', async () => {
    signOut.mockResolvedValue({ data: null, error: { status: 500, message: 'fail' } });
    mockApi({
      '/api/v1/me': () => Response.json({ data: USER }),
      '/api/v1/admin/menu/summary': () => Response.json({ data: SUMMARY }),
    });
    const router = renderAt('/admin');

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cerrar la sesión');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/admin');
  });
});

describe('DashboardPage', () => {
  async function renderDashboard(summary: Handler) {
    mockApi({
      '/api/v1/me': () => Response.json({ data: USER }),
      '/api/v1/admin/menu/summary': summary,
    });
    renderAt('/admin');
    await screen.findByRole('navigation', { name: 'Navegación principal' });
  }

  it('shows a skeleton while the summary loads', async () => {
    await renderDashboard(() => new Promise<Response>(() => {}));

    const region = await screen.findByRole('region', { name: 'Resumen de la carta' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(within(region).getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows the four summary cards linking to the filtered lists', async () => {
    await renderDashboard(() => Response.json({ data: SUMMARY }));

    const region = await screen.findByRole('region', { name: 'Resumen de la carta' });
    await within(region).findByText('48');
    expect(region).toHaveAttribute('aria-busy', 'false');
    expect(within(region).getByRole('link', { name: /Platos visibles/ })).toHaveAttribute(
      'href',
      '/admin/menu/dishes?status=visible',
    );
    expect(within(region).getByRole('link', { name: /Provisionales/ })).toHaveAttribute(
      'href',
      '/admin/menu/dishes?provisional=true',
    );
    expect(within(region).getByRole('link', { name: /Sin foto/ })).toHaveAttribute(
      'href',
      '/admin/menu/dishes?withoutImage=true',
    );
    expect(within(region).getByRole('link', { name: /Categorías/ })).toHaveAttribute(
      'href',
      '/admin/menu/categories',
    );
    expect(within(region).getByText('37')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuevo plato' })).toHaveAttribute(
      'href',
      '/admin/menu/dishes/new',
    );
    expect(screen.getByRole('link', { name: /Ver PDF/ })).toHaveAttribute(
      'href',
      '/api/v1/menu/pdf?lang=es',
    );
  });

  it('shows a translated error with a retry that reloads the summary', async () => {
    let fail = true;
    await renderDashboard(() =>
      fail ? new Response(null, { status: 500 }) : Response.json({ data: SUMMARY }),
    );

    // La consulta reintenta una vez (con espera) antes de mostrar el error.
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'No se pudo cargar el resumen',
    );
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('48')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('AdminLayout landmarks and login redirect', () => {
  it('has exactly one main landmark and a skip link to it as first focusable element', async () => {
    mockApi({
      '/api/v1/me': () => Response.json({ data: USER }),
      '/api/v1/admin/menu/summary': () => Response.json({ data: SUMMARY }),
    });
    renderAt('/admin');
    await screen.findByRole('navigation', { name: 'Navegación principal' });

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveAttribute('id', 'main-content');

    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Saltar al contenido' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#main-content');
  });

  it('sends a signed-in user who lands on the login with a valid next to that section', async () => {
    mockApi({ '/api/v1/me': () => Response.json({ data: USER }) });
    const router = renderAt('/admin/login?next=%2Fadmin%2Fmenu%2Fdishes%3Fstatus%3Dvisible');

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/admin/menu/dishes'));
    expect(router.state.location.search).toBe('?status=visible');
  });

  it('ignores an external next', async () => {
    mockApi({
      '/api/v1/me': () => Response.json({ data: USER }),
      '/api/v1/admin/menu/summary': () => Response.json({ data: SUMMARY }),
    });
    const router = renderAt('/admin/login?next=https%3A%2F%2Fevil.com');

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  });
});
