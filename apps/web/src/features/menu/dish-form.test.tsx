import type { AdminCategory, AdminDish } from '@pachamama/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { DishForm } from './dish-form';
import { errorKey } from './form-errors';

const CATEGORIES: AdminCategory[] = [
  {
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
  },
];

const DISH: AdminDish = {
  id: 12,
  categoryId: 4,
  nameDe: 'Ceviche',
  nameEs: 'Ceviche',
  descriptionDe: null,
  descriptionEs: null,
  price: 14.5,
  diet: null,
  allergens: ['D'],
  imageUrl: null,
  imageAltDe: null,
  imageAltEs: null,
  sortOrder: 1,
  status: 'visible',
  isProvisional: false,
  provisionalNote: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

const WITH_IMAGE: AdminDish = {
  ...DISH,
  imageUrl: { w400: '/uploads/a-400.webp', w800: '/uploads/a-800.webp', w1600: '/x.webp' },
  imageAltDe: 'Ceviche im Teller',
  imageAltEs: 'Ceviche en el plato',
};

interface Call {
  method: string;
  path: string;
  body: unknown;
}

/** Simula la API: guarda cada escritura; `respond` permite fallar una ruta concreta. */
function mockApi(respond?: (call: Call) => Response | undefined) {
  const calls: Call[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = new URL(String(input), 'http://localhost').pathname;
    const raw = init?.body;
    const body = raw instanceof FormData ? raw : raw ? JSON.parse(String(raw)) : undefined;
    const call = { method: init?.method ?? 'GET', path, body };
    calls.push(call);
    return respond?.(call) ?? Response.json({ data: { ...DISH, id: 30 } });
  });
  return calls;
}

function renderForm(props: Partial<React.ComponentProps<typeof DishForm>> = {}) {
  const onSaved = vi.fn();
  const onCreatedWithoutImage = vi.fn();
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <Link to="/other">Salir</Link>
            <DishForm
              categories={CATEGORIES}
              onSaved={onSaved}
              onCreatedWithoutImage={onCreatedWithoutImage}
              {...props}
            />
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
  return { onSaved, onCreatedWithoutImage, router };
}

async function fillRequired(price = '12,90') {
  await userEvent.selectOptions(screen.getByLabelText(/^Categoría/), '4');
  await userEvent.type(screen.getByLabelText(/^Nombre \(alemán\)/), 'Lomo saltado');
  await userEvent.type(screen.getByLabelText(/^Nombre \(español\)/), 'Lomo saltado');
  await userEvent.type(screen.getByLabelText(/^Precio/), price);
}

const photo = () => new File([new Uint8Array([1, 2, 3])], 'plato.jpg', { type: 'image/jpeg' });

beforeEach(async () => {
  await i18n.changeLanguage('es');
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('DishForm', () => {
  it('marks the required fields with aria-required', () => {
    renderForm();

    for (const label of [/^Categoría/, /^Nombre \(alemán\)/, /^Nombre \(español\)/, /^Precio/]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
    }
    expect(screen.getByLabelText(/^Descripción \(alemán\)/)).not.toHaveAttribute('aria-required');
  });

  it('shows translated errors for every empty required field (category and price included)', async () => {
    const calls = mockApi();
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Categoría: Este campo es obligatorio.');
    expect(summary).toHaveTextContent('Precio (€): Este campo es obligatorio.');
    expect(screen.getByLabelText(/^Categoría/)).toHaveAccessibleDescription(
      'Este campo es obligatorio.',
    );
    expect(screen.getByLabelText(/^Categoría/)).toHaveFocus();
    expect(summary).not.toHaveTextContent(/Invalid|expected/i);
    expect(calls).toHaveLength(0);
  });

  it('sends a price written with a comma as a number', async () => {
    const calls = mockApi();
    const { onSaved } = renderForm();

    await fillRequired('12,90');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/v1/admin/menu/dishes' });
    expect(calls[0]?.body).toMatchObject({
      categoryId: 4,
      nameDe: 'Lomo saltado',
      price: 12.9,
      diet: null,
      allergens: [],
      status: 'visible',
      isProvisional: false,
    });
  });

  it('shows the price error for an invalid price', async () => {
    mockApi();
    renderForm();

    await fillRequired('12,999');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByLabelText(/^Precio/)).toHaveAccessibleDescription(
      /Introduce un precio válido/,
    );
  });

  it('sends the checked allergens sorted and the chosen diet', async () => {
    const calls = mockApi();
    const { onSaved } = renderForm();

    await fillRequired();
    await userEvent.click(screen.getByRole('checkbox', { name: /^G/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /^A/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /^C/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Vegetariano' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls[0]?.body).toMatchObject({ allergens: ['A', 'C', 'G'], diet: 'vegetarian' });
  });

  it('lists the 14 allergens with letter and name', () => {
    renderForm();

    const group = screen.getByRole('group', { name: 'Alérgenos' });
    expect(within(group).getAllByRole('checkbox')).toHaveLength(14);
    expect(within(group).getByRole('checkbox', { name: 'A Cereales con gluten' })).toBeEnabled();
    expect(within(group).getByRole('checkbox', { name: 'N Moluscos' })).toBeEnabled();
  });

  it('counts the characters of the descriptions', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText(/^Descripción \(español\)/), 'Hola');

    expect(screen.getByText('4 de 1000 caracteres')).toBeInTheDocument();
  });

  it('requires the alt texts when a photo is chosen and shows a preview', async () => {
    const calls = mockApi();
    renderForm();

    await fillRequired();
    await userEvent.upload(screen.getByLabelText('Elegir foto'), photo());
    expect(screen.getByRole('img', { name: 'Vista previa de la foto' })).toHaveAttribute(
      'src',
      'blob:preview',
    );
    expect(screen.getByLabelText(/^Descripción de la foto \(alemán\)/)).toHaveAttribute(
      'aria-required',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const altDe = await screen.findByLabelText(/^Descripción de la foto \(alemán\)/);
    await waitFor(() => expect(altDe).toHaveAttribute('aria-invalid', 'true'));
    expect(altDe).toHaveAccessibleDescription(/Este campo es obligatorio/);
    expect(screen.getByLabelText(/^Descripción de la foto \(español\)/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(calls).toHaveLength(0);
  });

  it('rejects a file that is not a supported image right away', async () => {
    renderForm();

    await userEvent.upload(
      screen.getByLabelText('Elegir foto'),
      new File(['x'], 'menu.gif', { type: 'image/gif' }),
      { applyAccept: false },
    );

    expect(await screen.findByText('Solo fotos en formato JPEG, PNG o WebP.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Vista previa de la foto' })).not.toBeInTheDocument();
  });

  it('creates the dish and then uploads the photo with its alt texts', async () => {
    const calls = mockApi();
    const { onSaved } = renderForm();

    await fillRequired();
    await userEvent.upload(screen.getByLabelText('Elegir foto'), photo());
    await userEvent.type(screen.getByLabelText(/^Descripción de la foto \(alemán\)/), 'Teller');
    await userEvent.type(screen.getByLabelText(/^Descripción de la foto \(español\)/), 'Plato');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/admin/menu/dishes',
      'PUT /api/v1/admin/menu/dishes/30/image',
    ]);
    const form = calls[1]?.body as FormData;
    expect(form.get('altDe')).toBe('Teller');
    expect(form.get('altEs')).toBe('Plato');
    expect((form.get('image') as File).name).toBe('plato.jpg');
    expect(calls[0]?.body).not.toHaveProperty('imageAltDe');
  });

  it('keeps the new dish for editing when the photo upload fails', async () => {
    mockApi((call) =>
      call.method === 'PUT'
        ? Response.json({ error: { code: 'IMAGE_TOO_LARGE' } }, { status: 413 })
        : undefined,
    );
    const { onSaved, onCreatedWithoutImage } = renderForm();

    await fillRequired();
    await userEvent.upload(screen.getByLabelText('Elegir foto'), photo());
    await userEvent.type(screen.getByLabelText(/^Descripción de la foto \(alemán\)/), 'Teller');
    await userEvent.type(screen.getByLabelText(/^Descripción de la foto \(español\)/), 'Plato');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onCreatedWithoutImage).toHaveBeenCalled());
    expect(onCreatedWithoutImage.mock.calls[0]?.[0]).toMatchObject({ id: 30 });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('edits a dish: updates the alt texts of the existing photo through PATCH', async () => {
    const calls = mockApi(() => Response.json({ data: WITH_IMAGE }));
    const { onSaved } = renderForm({ dish: WITH_IMAGE });

    expect(screen.getByRole('img', { name: 'Vista previa de la foto' })).toHaveAttribute(
      'src',
      '/uploads/a-400.webp',
    );
    const altEs = screen.getByLabelText(/^Descripción de la foto \(español\)/);
    await userEvent.clear(altEs);
    await userEvent.type(altEs, 'Ceviche fresco');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: 'PATCH', path: '/api/v1/admin/menu/dishes/12' });
    expect(calls[0]?.body).toMatchObject({
      price: 14.5,
      allergens: ['D'],
      imageAltEs: 'Ceviche fresco',
    });
  });

  it('removes the existing photo on save', async () => {
    const calls = mockApi(() => Response.json({ data: WITH_IMAGE }));
    const { onSaved } = renderForm({ dish: WITH_IMAGE });

    await userEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));
    expect(screen.getByText('La foto se quitará al guardar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'PATCH /api/v1/admin/menu/dishes/12',
      'DELETE /api/v1/admin/menu/dishes/12/image',
    ]);
    expect(calls[0]?.body).not.toHaveProperty('imageAltDe');
  });

  it('shows server-side field errors from a 400 response', async () => {
    mockApi(() =>
      Response.json(
        {
          error: {
            code: 'INVALID_CATEGORY',
            details: { categoryId: ['validation.invalidCategory'] },
          },
        },
        { status: 400 },
      ),
    );
    renderForm();

    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByLabelText(/^Categoría/)).toHaveAccessibleDescription(
      'Elige una categoría activa.',
    );
  });

  it('is read-only for staff except the visible switch, which saves right away', async () => {
    const calls = mockApi(() => Response.json({ data: { ...DISH, status: 'hidden' } }));
    renderForm({ dish: DISH, readOnly: true });

    expect(screen.getByLabelText(/^Nombre \(alemán\)/)).toBeDisabled();
    expect(screen.getByLabelText(/^Precio/)).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /^D/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Elegir foto')).not.toBeInTheDocument();

    const visible = screen.getByRole('switch', { name: 'Visible en la carta' });
    expect(visible).toBeEnabled();
    await userEvent.click(visible);

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'PATCH', path: '/api/v1/admin/menu/dishes/12', body: { status: 'hidden' } },
      ]),
    );
  });

  it('asks before leaving with unsaved changes', async () => {
    const { router } = renderForm();
    await userEvent.type(screen.getByLabelText(/^Nombre \(alemán\)/), 'Algo');

    await userEvent.click(screen.getByRole('link', { name: 'Salir' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Cambios sin guardar');
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('errorKey', () => {
  it('keeps known validation keys and maps anything else to a translated generic error', () => {
    expect(errorKey('validation.price')).toBe('validation.price');
    expect(errorKey('Invalid input: expected number, received NaN')).toBe('validation.invalid');
    expect(errorKey('validation.doesNotExist')).toBe('validation.invalid');
    expect(errorKey(undefined)).toBeUndefined();
  });
});
