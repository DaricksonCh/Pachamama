import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { localIsoDate } from '@/features/reservations/dates';
import { createQueryClient } from '@/lib/query-client';
import { routes } from '@/router';

const { toastError, toastSuccess, toastWarning } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { error: toastError, success: toastSuccess, warning: toastWarning },
  Toaster: () => null,
}));

const USER = { id: 'u', name: 'U', email: 'u@x.test', role: 'staff' };

const reservation = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  publicId: `pub-${id}`,
  startsAt: '2026-11-25T17:30:00.000Z', // 18:30 en Berlín
  partySize: 4,
  name: 'Anna Beispiel',
  phone: '+49 30 123456',
  email: 'anna@example.test',
  comment: 'Cumpleaños',
  lang: 'de',
  status: 'pending',
  decidedAt: null,
  lastEmailFailed: false,
  ...extra,
});

const event = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  fromStatus: null,
  toStatus: 'pending',
  actorName: null,
  message: null,
  subject: null,
  emailStatus: null,
  createdAt: '2026-11-20T10:00:00.000Z',
  ...extra,
});

interface Options {
  path: string;
  list?: unknown[];
  detail?: Record<string, unknown>;
  pending?: number;
}

function setup({ path, list = [], detail, pending = 0 }: Options) {
  const requests: string[] = [];
  const writes: { method: string; path: string; body?: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    requests.push(url.pathname + url.search);
    if (url.pathname === '/api/v1/me') return Response.json({ data: USER });
    if (init?.method) {
      writes.push({
        method: init.method,
        path: url.pathname,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      });
      return Response.json({ data: { reservation: {}, emailStatus: 'sent' } });
    }
    if (url.pathname === '/api/v1/admin/reservations/pending-count') {
      return Response.json({ data: { count: pending } });
    }
    if (url.pathname === '/api/v1/admin/reservations') return Response.json({ data: list });
    if (url.pathname === '/api/v1/admin/reservations/1' && detail) {
      return Response.json({ data: detail });
    }
    if (url.pathname.endsWith('/message-preview')) {
      return Response.json({ data: { subject: 'Betreff', body: 'Text', lang: 'de' } });
    }
    return new Response(null, { status: 404 });
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { requests, writes, router };
}

const detailOf = (status: string, events: unknown[] = [event(1)]) => ({
  ...reservation(1, { status }),
  events,
});

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
  vi.clearAllMocks();
});

describe('ReservationsPage', () => {
  it('lists the day in Berlin time and defaults the date to today', async () => {
    const { requests } = setup({
      path: '/admin/reservations',
      list: [reservation(1), reservation(2, { name: 'Ben', lastEmailFailed: true })],
    });

    const today = localIsoDate(new Date());
    expect(
      await screen.findByRole('link', { name: 'Ver reserva de Anna Beispiel' }),
    ).toHaveAttribute('href', '/admin/reservations/1');
    expect(requests).toContain(`/api/v1/admin/reservations?date=${today}`);
    const rowAnna = screen.getByRole('row', { name: /Anna Beispiel/ });
    expect(within(rowAnna).getByText('18:30')).toBeInTheDocument();
    expect(within(rowAnna).getByText('Pendiente')).toBeInTheDocument();
    expect(
      within(screen.getByRole('row', { name: /Ben/ })).getByText('Error al enviar el correo'),
    ).toBeInTheDocument();
  });

  it('keeps the date and the status filter in the URL', async () => {
    const { requests, router } = setup({ path: '/admin/reservations?date=2026-11-25' });
    expect(await screen.findByText('No hay reservas para este día.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));
    await waitFor(() => expect(router.state.location.search).toContain('date=2026-11-26'));
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'confirmed');
    await waitFor(() =>
      expect(requests).toContain('/api/v1/admin/reservations?date=2026-11-26&status=confirmed'),
    );
  });

  it('shows the pending count in the sidebar with an accessible label', async () => {
    setup({ path: '/admin/reservations?date=2026-11-25', pending: 3 });
    expect(await screen.findByText('3 pendientes')).toBeInTheDocument();
  });

  it('hides the badge when nothing is pending', async () => {
    const { requests } = setup({ path: '/admin/reservations?date=2026-11-25', pending: 0 });
    await screen.findByText('No hay reservas para este día.');
    await waitFor(() => expect(requests).toContain('/api/v1/admin/reservations/pending-count'));
    expect(screen.queryByText(/pendientes$/)).not.toBeInTheDocument();
  });
});

describe('ReservationDetailPage', () => {
  it('shows contact links, comment, language and history', async () => {
    setup({
      path: '/admin/reservations/1',
      detail: detailOf('confirmed', [
        event(1),
        event(2, {
          fromStatus: 'pending',
          toStatus: 'confirmed',
          actorName: 'Ana Admin',
          message: 'Hasta pronto',
          subject: 'Asunto enviado',
          emailStatus: 'sent',
        }),
      ]),
    });

    expect(await screen.findByRole('link', { name: 'anna@example.test' })).toHaveAttribute(
      'href',
      'mailto:anna@example.test',
    );
    expect(screen.getByRole('link', { name: '+49 30 123456' })).toHaveAttribute(
      'href',
      'tel:+4930123456',
    );
    expect(screen.getByText('Cumpleaños')).toBeInTheDocument();
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
    expect(screen.getByText('Hasta pronto')).toBeInTheDocument();
    expect(screen.getByText(/Asunto enviado/)).toBeInTheDocument();
    expect(screen.getByText('Correo enviado')).toBeInTheDocument();
  });

  it('only offers the transitions allowed from the current status', async () => {
    setup({ path: '/admin/reservations/1', detail: detailOf('confirmed') });
    await screen.findByRole('heading', { name: /Anna Beispiel/ });

    expect(screen.getByRole('button', { name: 'Marcar como completada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar como no presentada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar reserva' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
  });

  it('offers no actions for a final status', async () => {
    setup({ path: '/admin/reservations/1', detail: detailOf('rejected') });
    await screen.findByRole('heading', { name: /Anna Beispiel/ });
    expect(screen.queryByRole('button', { name: /Confirmar|Rechazar|Cancelar|Marcar/ })).toBeNull();
  });

  it('marks a no-show after a simple confirmation, without an email', async () => {
    const { writes } = setup({ path: '/admin/reservations/1', detail: detailOf('confirmed') });
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como no presentada' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Marcar como no presentada' }),
    );

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      method: 'PATCH',
      path: '/api/v1/admin/reservations/1/status',
      body: { status: 'no_show' },
    });
  });

  it('opens the editable message dialog to confirm', async () => {
    setup({ path: '/admin/reservations/1', detail: detailOf('pending') });
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByLabelText('Mensaje al cliente')).toHaveValue('Text');
  });

  it('warns about a failed email and resends it', async () => {
    const { writes } = setup({
      path: '/admin/reservations/1',
      detail: detailOf('confirmed', [
        event(1),
        event(2, { fromStatus: 'pending', toStatus: 'confirmed', emailStatus: 'failed' }),
      ]),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar el correo');
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar correo' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/admin/reservations/1/resend-email',
    });
  });

  it('shows no banner when the last decision email was sent', async () => {
    setup({
      path: '/admin/reservations/1',
      detail: detailOf('confirmed', [
        event(1),
        event(2, { fromStatus: 'pending', toStatus: 'confirmed', emailStatus: 'sent' }),
      ]),
    });
    await screen.findByRole('heading', { name: /Anna Beispiel/ });
    expect(screen.queryByText('No se pudo enviar el correo')).not.toBeInTheDocument();
  });

  it('shows a not-found message for an unknown reservation', async () => {
    setup({ path: '/admin/reservations/99' });
    expect(await screen.findByText('No se encontró la reserva.')).toBeInTheDocument();
  });
});
