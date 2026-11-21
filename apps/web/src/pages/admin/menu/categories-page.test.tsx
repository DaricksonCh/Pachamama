import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { routes } from '@/router';

const cat = (id: number, nameEs: string, dishCount: number, status = 'visible') => ({
  id,
  nameDe: `${nameEs}-de`,
  nameEs,
  descriptionDe: null,
  descriptionEs: null,
  sortOrder: id,
  status,
  dishCount,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
});

type Category = ReturnType<typeof cat>;
const USER = { id: 'u', name: 'U', email: 'u@x.test' };

function renderPage() {
  const router = createMemoryRouter(routes, { initialEntries: ['/admin/menu/categories'] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

interface Options {
  role?: 'admin' | 'staff';
  active?: Category[];
  archived?: Category[];
  write?: () => Response;
}

function setup(options: Options = {}) {
  const {
    role = 'admin',
    active = [cat(1, 'Entrantes', 3), cat(2, 'Postres', 0)],
    archived = [],
    write,
  } = options;
  const writes: { method: string; path: string; body: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/v1/me') return Response.json({ data: { ...USER, role } });
    if (init?.method) {
      const body: unknown = init.body ? JSON.parse(String(init.body)) : undefined;
      writes.push({ method: init.method, path: url.pathname, body });
      return write ? write() : Response.json({ data: active[0] });
    }
    if (url.pathname === '/api/v1/admin/menu/categories') {
      const archivedOnly = url.searchParams.get('status') === 'archived';
      return Response.json({ data: archivedOnly ? archived : active });
    }
    return new Response(null, { status: 404 });
  });
  renderPage();
  return { writes };
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('CategoriesPage', () => {
  it('shows the admin controls: new link, first row cannot go up, last cannot go down', async () => {
    setup();

    expect(await screen.findByRole('link', { name: 'Nueva categoría' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Subir Entrantes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar Entrantes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Subir Postres' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Bajar Postres' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Archivar Postres' })).toBeInTheDocument();
  });

  it('is read-only for staff', async () => {
    setup({ role: 'staff' });

    expect(await screen.findByRole('link', { name: 'Ver Entrantes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nueva categoría' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archivar|Subir|Bajar/ })).not.toBeInTheDocument();
  });

  it('shows a loading skeleton while the list loads', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/me')) return Response.json({ data: { ...USER, role: 'admin' } });
      return new Promise<Response>(() => {});
    });
    renderPage();

    expect(await screen.findByRole('status', { busy: true })).toBeInTheDocument();
  });

  it('shows empty states for the active and archived lists', async () => {
    setup({ active: [], archived: [] });

    expect(await screen.findByText('Todavía no hay categorías.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Archivadas' }));
    expect(await screen.findByText('No hay categorías archivadas.')).toBeInTheDocument();
  });

  it('shows an error with a retry button that reloads the list', async () => {
    let fail = true;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname === '/api/v1/me') return Response.json({ data: { ...USER, role: 'admin' } });
      return fail
        ? new Response(null, { status: 500 })
        : Response.json({ data: [cat(1, 'Entrantes', 0)] });
    });
    renderPage();

    expect(
      await screen.findByText('No se pudieron cargar los datos.', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('link', { name: 'Editar Entrantes' })).toBeInTheDocument();
  });

  it('sends the new order when moving a category and announces the new position', async () => {
    const { writes } = setup();

    await userEvent.click(await screen.findByRole('button', { name: 'Subir Postres' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      method: 'PUT',
      path: '/api/v1/admin/menu/categories/order',
      body: { ids: [2, 1] },
    });
    expect(await screen.findByText('Postres: posición 1 de 2.')).toBeInTheDocument();
  });

  it('explains why a category with dishes cannot be archived and keeps the dialog open', async () => {
    setup({
      write: () => Response.json({ error: { code: 'CATEGORY_HAS_DISHES' } }, { status: 409 }),
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Archivar Entrantes' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Entrantes');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archivar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('aún tiene platos');
  });

  it('archives an empty category after confirming', async () => {
    const { writes } = setup();

    await userEvent.click(await screen.findByRole('button', { name: 'Archivar Postres' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Archivar' }),
    );

    await waitFor(() =>
      expect(writes).toEqual([
        { method: 'PATCH', path: '/api/v1/admin/menu/categories/2', body: { status: 'archived' } },
      ]),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('lists archived categories and restores one as hidden', async () => {
    const { writes } = setup({ archived: [cat(7, 'Antiguos', 0, 'archived')] });

    await userEvent.click(await screen.findByRole('button', { name: 'Archivadas' }));
    expect(await screen.findByText('Antiguos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Subir|Archivar/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar Antiguos' }));

    await waitFor(() =>
      expect(writes).toEqual([
        { method: 'PATCH', path: '/api/v1/admin/menu/categories/7', body: { status: 'hidden' } },
      ]),
    );
  });
});
