import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { routes } from '@/router';

const category = (status: string) => ({
  id: 4,
  nameDe: 'Vorspeisen',
  nameEs: 'Entrantes',
  descriptionDe: null,
  descriptionEs: null,
  sortOrder: 1,
  status,
  dishCount: 2,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
});

function setup(status: string, write?: () => Response) {
  const writes: { method: string; body: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/v1/me')
      return Response.json({ data: { id: 'u', name: 'U', email: 'u@x.test', role: 'admin' } });
    if (init?.method) {
      writes.push({ method: init.method, body: JSON.parse(String(init.body)) });
      return write ? write() : Response.json({ data: category('hidden') });
    }
    if (url.pathname === '/api/v1/admin/menu/categories/4')
      return Response.json({ data: category(status) });
    return new Response(null, { status: 404 });
  });
  const router = createMemoryRouter(routes, { initialEntries: ['/admin/menu/categories/4'] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { writes, router };
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('CategoryFormPage', () => {
  it('shows a 409 explanation inside the archive dialog on the detail page', async () => {
    setup('visible', () =>
      Response.json({ error: { code: 'CATEGORY_HAS_DISHES' } }, { status: 409 }),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Archivar' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archivar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('aún tiene platos');
  });

  it('archives from the detail page and goes back to the list', async () => {
    const { writes, router } = setup('visible');

    await userEvent.click(await screen.findByRole('button', { name: 'Archivar' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Archivar' }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/menu/categories'));
    expect(writes[0]).toEqual({ method: 'PATCH', body: { status: 'archived' } });
  });

  it('shows an archived category as archived and offers to restore it', async () => {
    const { writes } = setup('archived');

    expect(await screen.findByText(/está archivada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archivar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(writes).toEqual([{ method: 'PATCH', body: { status: 'hidden' } }]));
  });
});
