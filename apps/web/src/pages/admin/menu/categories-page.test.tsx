import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { routes } from '@/router';

const cat = (id: number, nameEs: string, dishCount: number) => ({
  id,
  nameDe: `${nameEs}-de`,
  nameEs,
  descriptionDe: null,
  descriptionEs: null,
  sortOrder: id,
  status: 'visible',
  dishCount,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
});
const CATEGORIES = [cat(1, 'Entrantes', 3), cat(2, 'Postres', 0)];

function setup(role: 'admin' | 'staff', patch?: () => Response) {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/v1/me')
      return Response.json({ data: { id: 'u', name: 'U', email: 'u@x.test', role } });
    if (url.pathname === '/api/v1/admin/menu/categories' && !init?.method)
      return Response.json({ data: CATEGORIES });
    if (init?.method === 'PATCH' && patch) return patch();
    return new Response(null, { status: 404 });
  });
  const router = createMemoryRouter(routes, { initialEntries: ['/admin/menu/categories'] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return spy;
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('CategoriesPage', () => {
  it('lets an admin create, reorder and archive', async () => {
    setup('admin');

    expect(await screen.findByRole('button', { name: 'Subir Entrantes' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Nueva categoría' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir Entrantes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar Entrantes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Archivar\s+Postres$/ })).toBeInTheDocument();
  });

  it('is read-only for staff', async () => {
    setup('staff');

    expect(await screen.findByRole('link', { name: /^Ver\s+Entrantes$/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nueva categoría' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archivar|Subir|Bajar/ })).not.toBeInTheDocument();
  });

  it('explains why a category with dishes cannot be archived and keeps the dialog open', async () => {
    setup('admin', () =>
      Response.json({ error: { code: 'CATEGORY_HAS_DISHES' } }, { status: 409 }),
    );

    await userEvent.click(await screen.findByRole('button', { name: /^Archivar\s+Entrantes$/ }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archivar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('aún tiene platos');
  });
});
