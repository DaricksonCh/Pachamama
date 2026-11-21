import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
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

  it('shows an error summary on submit with links that focus each invalid field', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Revisa los campos marcados');
    const link = within(summary).getByRole('link', { name: 'Nombre (español)' });
    await userEvent.click(link);
    expect(screen.getByLabelText(/Nombre [(]español[)]/)).toHaveFocus();
  });
});

describe('CategoryForm unsaved changes', () => {
  function renderWithLeaveLink(onSaved?: (router: ReturnType<typeof createMemoryRouter>) => void) {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <>
              <Link to="/other">Salir</Link>
              <CategoryForm onSaved={() => onSaved?.(router)} />
            </>
          ),
        },
        { path: '/other', element: <p>Otra página</p> },
      ],
      { initialEntries: ['/'] },
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    return router;
  }

  it('navigates freely while the form is pristine', async () => {
    const router = renderWithLeaveLink();

    await userEvent.click(screen.getByRole('link', { name: 'Salir' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/other'));
  });

  it('asks before leaving a dirty form; staying keeps the form, leaving navigates', async () => {
    const router = renderWithLeaveLink();
    await userEvent.type(screen.getByLabelText(/Nombre [(]alemán[)]/), 'Algo');

    await userEvent.click(screen.getByRole('link', { name: 'Salir' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Cambios sin guardar');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Seguir editando' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByLabelText(/Nombre [(]alemán[)]/)).toHaveValue('Algo');

    await userEvent.click(screen.getByRole('link', { name: 'Salir' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Salir sin guardar',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/other'));
  });

  it('does not block navigation right after a successful save', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: CATEGORY }));
    const router = renderWithLeaveLink((r) => void r.navigate('/other'));

    await userEvent.type(screen.getByLabelText(/Nombre [(]alemán[)]/), 'Desserts');
    await userEvent.type(screen.getByLabelText(/Nombre [(]español[)]/), 'Postres');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/other'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
