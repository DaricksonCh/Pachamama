import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { routes } from '@/router';

const CATEGORY = {
  id: 4,
  nameDe: 'Vorspeisen',
  nameEs: 'Entrantes',
  descriptionDe: null,
  descriptionEs: null,
  sortOrder: 1,
  status: 'visible',
  dishCount: 1,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

const dish = (status: string) => ({
  id: 12,
  categoryId: 4,
  nameDe: 'Ceviche',
  nameEs: 'Ceviche',
  descriptionDe: null,
  descriptionEs: null,
  price: 14.5,
  diet: null,
  allergens: [],
  imageUrl: null,
  imageAltDe: null,
  imageAltEs: null,
  sortOrder: 1,
  status,
  isProvisional: false,
  provisionalNote: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
});

interface Options {
  path?: string;
  status?: string;
  role?: 'admin' | 'staff';
  dishResponse?: () => Response | Promise<Response>;
  write?: (method: string, path: string) => Response | undefined;
}

function setup({
  path = '/admin/menu/dishes/12',
  status = 'visible',
  role = 'admin',
  dishResponse,
  write,
}: Options = {}) {
  const writes: { method: string; path: string; body: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/v1/me')
      return Response.json({ data: { id: 'u', name: 'U', email: 'u@x.test', role } });
    if (init?.method) {
      const body = init.body instanceof FormData ? init.body : JSON.parse(String(init.body));
      writes.push({ method: init.method, path: url.pathname, body });
      return write?.(init.method, url.pathname) ?? Response.json({ data: dish('hidden') });
    }
    if (url.pathname === '/api/v1/admin/menu/categories') {
      return Response.json({ data: [CATEGORY] });
    }
    if (url.pathname === '/api/v1/admin/menu/dishes/12') {
      return dishResponse ? dishResponse() : Response.json({ data: dish(status) });
    }
    return new Response(null, { status: 404 });
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { writes, router };
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('DishFormPage', () => {
  it('shows a skeleton while the dish loads', async () => {
    setup({ dishResponse: () => new Promise<Response>(() => {}) });

    expect(await screen.findByRole('status', { busy: true })).toBeInTheDocument();
  });

  it('says when the dish does not exist', async () => {
    setup({ dishResponse: () => Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 }) });

    expect(
      await screen.findByText('El plato no existe.', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it('shows a load error with retry', async () => {
    let fail = true;
    setup({
      dishResponse: () =>
        fail ? new Response(null, { status: 500 }) : Response.json({ data: dish('visible') }),
    });

    expect(
      await screen.findByText('No se pudieron cargar los datos.', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Ceviche' })).toBeInTheDocument();
  });

  it('preselects the category from the URL for a new dish', async () => {
    setup({ path: '/admin/menu/dishes/new?categoryId=4' });

    expect(await screen.findByLabelText(/^Categoría/)).toHaveValue('4');
  });

  it('does not let staff create dishes', async () => {
    setup({ path: '/admin/menu/dishes/new', role: 'staff' });

    expect(await screen.findByText('No tienes permiso para esta acción.')).toBeInTheDocument();
  });

  it('archives from the detail page and goes back to the list', async () => {
    const { writes, router } = setup();

    await userEvent.click(await screen.findByRole('button', { name: 'Archivar' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Archivar' }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/menu/dishes'));
    expect(writes[0]).toMatchObject({ method: 'PATCH', body: { status: 'archived' } });
  });

  it('shows an archived dish as archived and restores it', async () => {
    const { writes } = setup({ status: 'archived' });

    expect(await screen.findByText(/está archivado/)).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Visible en la carta' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(writes[0]).toMatchObject({ body: { status: 'hidden' } }));
  });

  it('continues in the new dish when its photo cannot be uploaded', async () => {
    const created = { ...dish('visible'), id: 12 };
    const { router, writes } = setup({
      path: '/admin/menu/dishes/new',
      write: (method) =>
        method === 'POST'
          ? Response.json({ data: created })
          : Response.json({ error: { code: 'UNSUPPORTED_IMAGE' } }, { status: 415 }),
    });

    await userEvent.selectOptions(await screen.findByLabelText(/^Categoría/), '4');
    await userEvent.type(screen.getByLabelText(/^Nombre \(alemán\)/), 'Ceviche');
    await userEvent.type(screen.getByLabelText(/^Nombre \(español\)/), 'Ceviche');
    await userEvent.type(screen.getByLabelText(/^Precio/), '14.50');
    await userEvent.upload(
      screen.getByLabelText('Elegir foto'),
      new File([new Uint8Array([1])], 'c.jpg', { type: 'image/jpeg' }),
    );
    await userEvent.type(screen.getByLabelText(/^Descripción de la foto \(alemán\)/), 'Teller');
    await userEvent.type(screen.getByLabelText(/^Descripción de la foto \(español\)/), 'Plato');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/menu/dishes/12'));
    expect(writes.map((w) => w.method)).toEqual(['POST', 'PUT']);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
