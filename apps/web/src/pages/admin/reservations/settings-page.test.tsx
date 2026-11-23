import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { routes } from '@/router';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}));

const SETTINGS = {
  slotMinutes: 30,
  lastSlotBeforeCloseMinutes: 60,
  partyMin: 1,
  partyMax: 10,
  capacityPerSlot: 30,
  minLeadMinutes: 120,
  maxAdvanceDays: 60,
  sameDayOnline: false,
};

const MONDAY = { weekday: 1, opens: '12:00', closes: '15:00' };
const SUNDAY = { weekday: 0, opens: '13:00', closes: '22:00' };

const templates = () =>
  (['received', 'confirmed', 'rejected', 'cancelled'] as const).flatMap((kind) =>
    (['de', 'es'] as const).map((lang) => ({
      kind,
      lang,
      subject: `Asunto ${kind} ${lang}`,
      body:
        kind === 'received' && lang === 'es'
          ? 'Hola {name}, {date} a las {time} para {party}.'
          : `Texto ${kind} ${lang}`,
    })),
  );

interface Options {
  role?: 'admin' | 'staff';
  hours?: unknown[];
  hoursConfirmed?: boolean;
  closures?: unknown[];
  settings?: unknown;
}

function setup({
  role = 'admin',
  hours = [MONDAY, SUNDAY],
  hoursConfirmed = true,
  closures = [],
  settings = SETTINGS,
}: Options = {}) {
  const writes: { method: string; path: string; body?: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/v1/me') {
      return Response.json({ data: { id: 'u', name: 'U', email: 'u@x.test', role } });
    }
    if (init?.method && init.method !== 'GET') {
      writes.push({
        method: init.method,
        path: url.pathname,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      });
      if (init.method === 'DELETE') return new Response(null, { status: 204 });
      return Response.json({ data: { hours, hoursConfirmed: true } });
    }
    const base = '/api/v1/admin/reservation-settings';
    if (url.pathname === `${base}/hours`) return Response.json({ data: { hours, hoursConfirmed } });
    if (url.pathname === `${base}/closures`) return Response.json({ data: closures });
    if (url.pathname === `${base}/settings`) return Response.json({ data: settings });
    if (url.pathname === `${base}/templates`) return Response.json({ data: templates() });
    if (url.pathname.startsWith('/api/v1/admin/reservations/pending-count')) {
      return Response.json({ data: { count: 0 } });
    }
    return new Response(null, { status: 404 });
  });
  const router = createMemoryRouter(routes, { initialEntries: ['/admin/reservations/settings'] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { writes };
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
  vi.restoreAllMocks();
});

describe('permissions', () => {
  it('staff get a no-permission message and no sidebar link', async () => {
    setup({ role: 'staff' });
    expect(await screen.findByText('No tienes permiso para ver esta página.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ajustes de reservas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('admins see the sidebar link and the four tabs', async () => {
    setup();
    expect(await screen.findByRole('link', { name: 'Ajustes de reservas' })).toHaveAttribute(
      'href',
      '/admin/reservations/settings',
    );
    expect(await screen.findAllByRole('tab')).toHaveLength(4);
  });
});

describe('opening hours', () => {
  it('shows the provisional notice until the hours are confirmed', async () => {
    setup({ hoursConfirmed: false });
    expect(await screen.findByText(/Horario provisional/)).toBeInTheDocument();
  });

  it('rejects overlapping ranges without calling the API', async () => {
    const { writes } = setup({
      hours: [MONDAY, { weekday: 1, opens: '14:00', closes: '18:00' }],
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar horario' }));

    expect((await screen.findAllByText('Los tramos se solapan.')).length).toBeGreaterThan(0);
    expect(writes).toEqual([]);
  });

  it('sends Monday to Sunday with Sunday as weekday 0', async () => {
    const { writes } = setup();
    await userEvent.selectOptions(await screen.findByLabelText('Domingo, cierre tramo 1'), '21:30');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      method: 'PUT',
      path: '/api/v1/admin/reservation-settings/hours',
      body: {
        hours: [MONDAY, { weekday: 0, opens: '13:00', closes: '21:30' }],
      },
    });
  });
});

describe('closures', () => {
  it('asks for confirmation before deleting a closure', async () => {
    const { writes } = setup({
      closures: [{ id: 7, from: '2026-12-24', to: '2026-12-26', reasonDe: 'Weihnachten' }],
    });
    await userEvent.click(await screen.findByRole('tab', { name: 'Cierres' }));
    await userEvent.click(await screen.findByRole('button', { name: /Eliminar cierre/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(writes).toEqual([]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() =>
      expect(writes).toEqual([
        { method: 'DELETE', path: '/api/v1/admin/reservation-settings/closures/7' },
      ]),
    );
  });
});

describe('reservation settings', () => {
  it('shows a range error when the minimum exceeds the maximum', async () => {
    const { writes } = setup();
    await userEvent.click(await screen.findByRole('tab', { name: 'Reservas' }));
    const min = await screen.findByLabelText(/Mínimo de personas/);
    await userEvent.clear(min);
    await userEvent.type(min, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }));

    expect((await screen.findAllByText('El rango no es válido.')).length).toBeGreaterThan(0);
    expect(writes).toEqual([]);
  });
});

describe('email templates', () => {
  it('lists the variables and previews the text with sample data', async () => {
    setup();
    await userEvent.click(await screen.findByRole('tab', { name: 'Textos de correo' }));

    const variables = await screen.findByRole('list', { name: 'Variables disponibles' });
    for (const name of ['{name}', '{date}', '{time}', '{party}']) {
      expect(within(variables).getByText(name)).toBeInTheDocument();
    }
    expect(
      await screen.findByText('Hola Ana García, sáb., 28 nov. 2026 a las 20:00 para 4.'),
    ).toBeInTheDocument();
  });
});
