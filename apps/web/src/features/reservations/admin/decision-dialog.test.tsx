import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { createQueryClient } from '@/lib/query-client';
import { DecisionDialog } from './decision-dialog';

const { toastError, toastSuccess, toastWarning } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { error: toastError, success: toastSuccess, warning: toastWarning },
  Toaster: () => null,
}));

const PREVIEW = {
  subject: 'Deine Reservierung ist bestätigt',
  body: 'Hallo Anna,\nwir freuen uns auf Sie.',
  lang: 'de',
};
const RESERVATION = { id: 7, name: 'Anna', lang: 'de' as const };

interface Options {
  status?: 'confirmed' | 'rejected' | 'cancelled';
  patchStatus?: number;
  onOpenChange?: (open: boolean) => void;
  onDone?: () => void;
}

function setup({ status = 'confirmed', patchStatus = 200, onOpenChange, onDone }: Options = {}) {
  const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    if (init?.method === 'PATCH') {
      writes.push({
        method: 'PATCH',
        path: url.pathname,
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
      });
      if (patchStatus !== 200) {
        return Response.json({ error: { code: 'INVALID_TRANSITION' } }, { status: patchStatus });
      }
      return Response.json({ data: { reservation: {}, emailStatus: 'sent' } });
    }
    if (url.pathname === '/api/v1/admin/reservations/7/message-preview') {
      return Response.json({ data: PREVIEW });
    }
    return new Response(null, { status: 404 });
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <DecisionDialog
        reservation={RESERVATION}
        status={status}
        open
        onOpenChange={onOpenChange ?? (() => {})}
        onDone={onDone}
      />
    </QueryClientProvider>,
  );
  return { writes };
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  await i18n.changeLanguage('de');
  vi.clearAllMocks();
});

const body = () => screen.findByLabelText('Mensaje al cliente');
const subject = () => screen.findByLabelText('Asunto');

describe('DecisionDialog', () => {
  it('shows the default subject and text in the customer language', async () => {
    setup();

    expect(await subject()).toHaveValue(PREVIEW.subject);
    expect(await body()).toHaveValue(PREVIEW.body);
    expect(screen.getByText('Idioma del cliente: alemán')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar y confirmar' })).toBeEnabled();
  });

  it('links a live counter to the text area', async () => {
    setup();
    const textarea = await body();
    const counter = document.getElementById(textarea.getAttribute('aria-describedby') ?? '');
    expect(counter).toHaveTextContent(`${PREVIEW.body.length} / 2000`);

    await userEvent.type(textarea, '!');
    expect(counter).toHaveTextContent(`${PREVIEW.body.length + 1} / 2000`);
  });

  it('sends the edited message when the text was changed', async () => {
    const { writes } = setup();
    await userEvent.type(await body(), ' Bis bald!');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar y confirmar' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      path: '/api/v1/admin/reservations/7/status',
      body: { status: 'confirmed', notify: true, message: `${PREVIEW.body} Bis bald!` },
    });
    expect(writes[0]?.body).not.toHaveProperty('subject');
  });

  it('sends the edited subject when only the subject was changed', async () => {
    const { writes } = setup();
    const input = await subject();
    await userEvent.clear(input);
    await userEvent.type(input, 'Neu');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar y confirmar' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toEqual({ status: 'confirmed', notify: true, subject: 'Neu' });
  });

  it('sends no message when the text was not edited, then toasts and finishes', async () => {
    const onDone = vi.fn();
    const { writes } = setup({ onDone });
    await body();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar y confirmar' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toEqual({ status: 'confirmed', notify: true });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(onDone).toHaveBeenCalled();
  });

  it('restores the default text and subject', async () => {
    const { writes } = setup();
    const textarea = await body();
    const input = await subject();
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'otro');
    await userEvent.type(input, 'x');

    await userEvent.click(screen.getByRole('button', { name: 'Restaurar texto predeterminado' }));
    expect(textarea).toHaveValue(PREVIEW.body);
    expect(input).toHaveValue(PREVIEW.subject);

    await userEvent.click(screen.getByRole('button', { name: 'Enviar y confirmar' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toEqual({ status: 'confirmed', notify: true });
  });

  it('sends notify false without text when the checkbox is cleared', async () => {
    const { writes } = setup({ status: 'rejected' });
    await userEvent.type(await body(), ' extra');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Enviar correo al cliente' }));

    expect(await body()).toBeDisabled();
    expect(await subject()).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar sin correo' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toEqual({ status: 'rejected', notify: false });
  });

  it('shows what will be sent in a preview area', async () => {
    setup();
    await userEvent.type(await body(), ' Bis bald!');
    const preview = screen.getByRole('region', { name: 'Vista previa del correo' });
    expect(preview).toHaveTextContent(PREVIEW.subject);
    expect(preview).toHaveTextContent('Bis bald!');
  });

  it('toasts the error on a conflict and closes the dialog', async () => {
    const onOpenChange = vi.fn();
    setup({ patchStatus: 409, onOpenChange });
    await body();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar y confirmar' }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('asks before closing with unsaved edits', async () => {
    const onOpenChange = vi.fn();
    setup({ onOpenChange });
    await userEvent.type(await body(), ' cambio');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(await screen.findByText('Cambios sin guardar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
