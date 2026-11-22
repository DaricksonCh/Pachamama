import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { routes } from '@/router';

const USER = { id: 'u', name: 'U', email: 'u@x.test' };
const CATEGORY = {
  id: 4,
  nameDe: 'Vorspeisen',
  nameEs: 'Entrantes',
  descriptionDe: null,
  descriptionEs: null,
  sortOrder: 1,
  status: 'visible',
  dishCount: 2,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

const dish = (id: number, nameEs: string, extra: Record<string, unknown> = {}) => ({
  id,
  categoryId: 4,
  nameDe: `${nameEs}-de`,
  nameEs,
  descriptionDe: null,
  descriptionEs: null,
  price: 12.9,
  diet: null,
  allergens: [],
  imageUrl: null,
  imageAltDe: null,
  imageAltEs: null,
  sortOrder: id,
  status: 'visible',
  isProvisional: false,
  provisionalNote: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...extra,
});

const DISHES = [
  dish(1, 'Ceviche', {
    isProvisional: true,
    imageUrl: { w400: '/uploads/c-400.webp', w800: '/uploads/c-800.webp', w1600: '/c.webp' },
  }),
  dish(2, 'Lomo saltado', { status: 'hidden' }),
];

interface Options {
  role?: 'admin' | 'staff';
  dishes?: ReturnType<typeof dish>[];
  path?: string;
}

function setup({ role = 'admin', dishes = DISHES, path = '/admin/menu/dishes' }: Options = {}) {
  const writes: { method: string; path: string; body: unknown }[] = [];
  const queries: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/v1/me') return Response.json({ data: { ...USER, role } });
    if (init?.method) {
      writes.push({
        method: init.method,
        path: url.pathname,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      });
      return Response.json({ data: dishes[0] });
    }
    if (url.pathname === '/api/v1/admin/menu/categories') {
      return Response.json({ data: [CATEGORY] });
    }
    if (url.pathname === '/api/v1/admin/menu/dishes') {
      queries.push(url.search);
      return Response.json({ data: dishes });
    }
    return new Response(null, { status: 404 });
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { writes, queries, router };
}

const row = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('DishesPage', () => {
  it('lists dishes with thumbnail, category, price, status and provisional badge', async () => {
    setup();

    expect(await screen.findByRole('link', { name: 'Editar Ceviche' })).toBeInTheDocument();
    const ceviche = row('Ceviche');
    expect(within(ceviche).getByText('Provisional')).toBeInTheDocument();
    expect(within(ceviche).getByText('Entrantes')).toBeInTheDocument();
    expect(within(ceviche).getByText(/12,90\s€/)).toBeInTheDocument();
    expect(ceviche.querySelector('img')).toHaveAttribute('src', '/uploads/c-400.webp');
    expect(within(row('Lomo saltado')).getByText('Sin foto')).toBeInTheDocument();
    expect(within(row('Lomo saltado')).getByText('Oculto')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuevo plato' })).toBeInTheDocument();
  });

  it('reads the filters from the URL and writes changes back to it', async () => {
    const { queries, router } = setup({ path: '/admin/menu/dishes?provisional=true' });

    expect(await screen.findByLabelText('Solo provisionales')).toBeChecked();
    await waitFor(() => expect(queries).toContain('?provisional=true'));

    await userEvent.selectOptions(screen.getByLabelText('Categoría'), '4');
    await waitFor(() =>
      expect(router.state.location.search).toBe('?provisional=true&categoryId=4'),
    );
    await userEvent.type(screen.getByLabelText('Buscar por nombre'), 'lomo');
    await waitFor(() => expect(router.state.location.search).toContain('q=lomo'));
    await waitFor(() => expect(queries.at(-1)).toBe('?categoryId=4&q=lomo&provisional=true'));

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByLabelText('Buscar por nombre')).toHaveValue('');
  });

  it('offers reordering only when filtered by a single category', async () => {
    setup();
    await screen.findByRole('link', { name: 'Editar Ceviche' });
    expect(screen.queryByRole('button', { name: /Subir|Bajar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Para cambiar el orden/)).toBeInTheDocument();
  });

  it('reorders within a category', async () => {
    const { writes } = setup({ path: '/admin/menu/dishes?categoryId=4' });

    await userEvent.click(await screen.findByRole('button', { name: 'Bajar Ceviche' }));

    await waitFor(() =>
      expect(writes).toEqual([
        { method: 'PUT', path: '/api/v1/admin/menu/dishes/order', body: { ids: [2, 1] } },
      ]),
    );
    expect(await screen.findByText('Ceviche: posición 2 de 2.')).toBeInTheDocument();
  });

  it('hides a visible dish and archives one after confirming', async () => {
    const { writes } = setup();

    await userEvent.click(await screen.findByRole('button', { name: 'Ocultar Ceviche' }));
    await userEvent.click(screen.getByRole('button', { name: 'Archivar Lomo saltado' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Archivar' }),
    );

    await waitFor(() =>
      expect(writes).toEqual([
        { method: 'PATCH', path: '/api/v1/admin/menu/dishes/1', body: { status: 'hidden' } },
        { method: 'PATCH', path: '/api/v1/admin/menu/dishes/2', body: { status: 'archived' } },
      ]),
    );
  });

  it('restores an archived dish', async () => {
    const { writes } = setup({
      path: '/admin/menu/dishes?status=archived',
      dishes: [dish(7, 'Antiguo', { status: 'archived' })],
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Restaurar Antiguo' }));

    await waitFor(() =>
      expect(writes).toEqual([
        { method: 'PATCH', path: '/api/v1/admin/menu/dishes/7', body: { status: 'hidden' } },
      ]),
    );
    expect(within(row('Antiguo')).getAllByRole('button')).toHaveLength(1);
  });

  it('lets staff only toggle visibility', async () => {
    const { writes } = setup({ role: 'staff' });

    expect(await screen.findByRole('link', { name: 'Ver Ceviche' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nuevo plato' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archivar|Subir|Bajar/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar Lomo saltado' }));

    await waitFor(() =>
      expect(writes).toEqual([
        { method: 'PATCH', path: '/api/v1/admin/menu/dishes/2', body: { status: 'visible' } },
      ]),
    );
  });

  it('shows a loading skeleton while the list loads', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/me')) return Response.json({ data: { ...USER, role: 'admin' } });
      return new Promise<Response>(() => {});
    });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider
          router={createMemoryRouter(routes, { initialEntries: ['/admin/menu/dishes'] })}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('status', { busy: true })).toBeInTheDocument();
  });

  it('distinguishes an empty menu from filters without results', async () => {
    setup({ dishes: [] });
    expect(await screen.findByText('Todavía no hay platos.')).toBeInTheDocument();
  });

  it('says when no dish matches the filters', async () => {
    setup({ dishes: [], path: '/admin/menu/dishes?withoutImage=true' });
    expect(await screen.findByText('Ningún plato coincide con estos filtros.')).toBeInTheDocument();
  });

  it('shows an error with a retry button that reloads the list', async () => {
    let fail = true;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname === '/api/v1/me') return Response.json({ data: { ...USER, role: 'admin' } });
      if (url.pathname === '/api/v1/admin/menu/categories') {
        return Response.json({ data: [CATEGORY] });
      }
      return fail ? new Response(null, { status: 500 }) : Response.json({ data: DISHES });
    });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider
          router={createMemoryRouter(routes, { initialEntries: ['/admin/menu/dishes'] })}
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('No se pudieron cargar los datos.', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('link', { name: 'Editar Ceviche' })).toBeInTheDocument();
  });
});
