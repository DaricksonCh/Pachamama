import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { CategoryForm } from './category-form';

const CATEGORY = {
  id: 4,
  nameDe: 'Vorspeisen',
  nameEs: 'Entrantes',
  descriptionDe: null,
  descriptionEs: null,
  sortOrder: 1,
  status: 'visible' as const,
  dishCount: 3,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

function renderForm(props: Partial<React.ComponentProps<typeof CategoryForm>> = {}) {
  const onSaved = vi.fn();
  const router = createMemoryRouter(
    [{ path: '/', element: <CategoryForm onSaved={onSaved} {...props} /> }],
    { initialEntries: ['/'] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { onSaved };
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('CategoryForm', () => {
  it('marks the name fields as required', () => {
    renderForm();

    expect(screen.getByLabelText(/Nombre \(alemán\)/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/Nombre \(español\)/)).toHaveAttribute('aria-required', 'true');
  });

  it('shows errors on both names when submitted empty and focuses the first invalid field', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const de = await screen.findByLabelText(/Nombre \(alemán\)/);
    const es = screen.getByLabelText(/Nombre \(español\)/);
    await waitFor(() => expect(de).toHaveAttribute('aria-invalid', 'true'));
    expect(es).toHaveAttribute('aria-invalid', 'true');
    expect(de).toHaveAccessibleDescription('Este campo es obligatorio.');
    expect(de).toHaveFocus();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('creates a category and reports it as saved', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ data: { ...CATEGORY, id: 9, nameDe: 'Desserts', nameEs: 'Postres' } }),
      );
    const { onSaved } = renderForm();

    await userEvent.type(screen.getByLabelText(/Nombre \(alemán\)/), 'Desserts');
    await userEvent.type(screen.getByLabelText(/Nombre \(español\)/), 'Postres');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toBe('/api/v1/admin/menu/categories');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      nameDe: 'Desserts',
      nameEs: 'Postres',
      status: 'visible',
    });
  });

  it('shows server-side field errors from a 400 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { error: { code: 'VALIDATION_ERROR', details: { nameDe: ['validation.tooLong'] } } },
        { status: 400 },
      ),
    );
    renderForm({ category: CATEGORY });

    await userEvent.type(screen.getByLabelText(/Nombre \(alemán\)/), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El texto es demasiado largo.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre \(alemán\)/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('is read-only for staff: fields disabled and no save button', () => {
    renderForm({ category: CATEGORY, readOnly: true });

    expect(screen.getByLabelText(/Nombre \(alemán\)/)).toBeDisabled();
    expect(screen.getByLabelText(/Nombre \(alemán\)/)).toHaveValue('Vorspeisen');
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });
});
