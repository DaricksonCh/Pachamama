import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { ReservationWizard } from './reservation-wizard';

interface Call {
  method: string;
  path: string;
  search: URLSearchParams;
  body: unknown;
}

const SETTINGS = { partyMin: 1, partyMax: 8, sameDayOnline: false };
const SLOTS = [
  { time: '12:30', startsAt: '2026-11-25T11:30:00.000Z', available: true },
  { time: '13:00', startsAt: '2026-11-25T12:00:00.000Z', available: false },
  { time: '19:00', startsAt: '2026-11-25T18:00:00.000Z', available: true },
  { time: '19:30', startsAt: '2026-11-25T18:30:00.000Z', available: true },
];
const CREATED = {
  data: {
    publicId: 'abc123',
    startsAt: '2026-11-25T18:00:00.000Z',
    partySize: 4,
    status: 'pending',
  },
};

/** Simulates the API; `respond` can override any call (return undefined for the default). */
function mockApi(respond?: (call: Call) => Response | undefined) {
  const calls: Call[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const raw = init?.body;
    const call: Call = {
      method: init?.method ?? 'GET',
      path: url.pathname,
      search: url.searchParams,
      body: raw ? JSON.parse(String(raw)) : undefined,
    };
    calls.push(call);
    const custom = respond?.(call);
    if (custom) return custom;
    if (call.method === 'POST') return Response.json(CREATED, { status: 201 });
    if (call.search.has('month')) {
      const days =
        call.search.get('month') === '2026-11' ? ['2026-11-25', '2026-11-26'] : ['2026-12-03'];
      return Response.json({ data: { days, ...SETTINGS } });
    }
    return Response.json({ data: { slots: SLOTS } });
  });
  return calls;
}

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReservationWizard />
    </QueryClientProvider>,
    { wrapper: MemoryRouter },
  );
  return client;
}

const next = () => userEvent.click(screen.getByRole('button', { name: /^(Siguiente|Weiter)$/ }));

async function pickParty(n: number) {
  const name = new RegExp(`^${n} (personas?|Personen?)$`);
  await userEvent.click(await screen.findByRole('radio', { name }));
}
const day = (n: number) => screen.findByRole('button', { name: new RegExp(`(^|\\D)${n}(\\D|$)`) });

async function reachDate() {
  await pickParty(4);
  await next();
  await screen.findByRole('heading', { name: /¿Qué día\?|Welcher Tag\?/ });
}
async function reachTime() {
  await reachDate();
  await userEvent.click(await day(25));
  await next();
  await screen.findByRole('heading', { name: /¿A qué hora\?|Welche Uhrzeit\?/ });
}
async function reachDetails() {
  await reachTime();
  await userEvent.click(await screen.findByRole('radio', { name: /19:00/ }));
  await next();
  await screen.findByRole('heading', { name: /Tus datos|Ihre Angaben/ });
}
async function fillDetails() {
  await userEvent.type(screen.getByLabelText(/^Nombre/), 'Ana Pérez');
  await userEvent.type(screen.getByLabelText(/^Email/), 'ana@example.com');
  await userEvent.type(screen.getByLabelText(/^Teléfono/), '+49 421 123456');
  await userEvent.click(screen.getByRole('checkbox', { name: /privacidad/i }));
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-22T10:00:00Z'));
  await i18n.changeLanguage('es');
});
afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage('de');
});

describe('ReservationWizard', () => {
  it('walks through the four steps and posts the right payload', async () => {
    const calls = mockApi();
    renderWizard();
    await reachDetails();
    await fillDetails();
    await userEvent.type(screen.getByLabelText(/^Comentario/), 'Cumpleaños');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await screen.findByRole('heading', { name: /Solicitud recibida/ });
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.path).toBe('/api/v1/reservations');
    expect(post?.body).toEqual({
      partySize: 4,
      date: '2026-11-25',
      time: '19:00',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '+49 421 123456',
      comment: 'Cumpleaños',
      lang: 'es',
      privacyAccepted: true,
      website: '',
    });
    expect(screen.getByText(/19:00/)).toBeVisible();
    expect(screen.getByText(/spam/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toHaveAttribute('href', '/es');
  });

  it('offers 1…partyMax and a note for bigger groups', async () => {
    mockApi();
    renderWizard();
    await screen.findByRole('radio', { name: '8 personas' });
    expect(screen.queryByRole('radio', { name: '9 personas' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Más/ }));
    expect(screen.getByText(/0421 000 000 0/)).toBeVisible();
  });

  it('keeps Next disabled until a party size is chosen', async () => {
    mockApi();
    renderWizard();
    await screen.findByRole('radio', { name: '2 personas' });
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('does not let you pick a day without availability', async () => {
    mockApi();
    renderWizard();
    await reachDate();
    expect(await day(25)).toBeEnabled();
    expect(await day(24)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('loads another month when navigating the calendar', async () => {
    const calls = mockApi();
    renderWizard();
    await reachDate();
    await userEvent.click(screen.getByRole('button', { name: /mes siguiente/i }));
    await waitFor(async () => expect(await day(3)).toBeEnabled());
    expect(calls.some((c) => c.search.get('month') === '2026-12')).toBe(true);
  });

  it('shows the same-day note when sameDayOnline is false', async () => {
    mockApi();
    renderWizard();
    await reachDate();
    expect(screen.getByText(/mismo día/i)).toBeVisible();
  });

  it('groups slots by lunch and dinner and marks full ones as unavailable', async () => {
    const calls = mockApi();
    renderWizard();
    await reachTime();
    await screen.findByRole('radio', { name: /12:30/ });
    expect(
      calls.some((c) => c.search.get('date') === '2026-11-25' && c.search.get('party') === '4'),
    ).toBe(true);
    const lunch = screen.getByRole('radiogroup', { name: 'Mediodía' });
    const dinner = screen.getByRole('radiogroup', { name: 'Noche' });
    expect(within(lunch).getByRole('radio', { name: /12:30/ })).toBeEnabled();
    const full = within(lunch).getByRole('radio', { name: /13:00/ });
    expect(full).toHaveAttribute('aria-disabled', 'true');
    expect(full).toHaveAccessibleName(/completo/);
    await userEvent.click(full);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(within(dinner).getByRole('radio', { name: /19:30/ })).toBeEnabled();
  });

  it('shows an empty state when there are no slots', async () => {
    mockApi((call) =>
      call.search.has('date') ? Response.json({ data: { slots: [] } }) : undefined,
    );
    renderWizard();
    await reachTime();
    expect(await screen.findByText(/No hay horas disponibles/)).toBeVisible();
  });

  it('changing the date clears the chosen time', async () => {
    mockApi();
    renderWizard();
    await reachTime();
    await userEvent.click(await screen.findByRole('radio', { name: /19:00/ }));
    expect(screen.getByRole('complementary')).toHaveTextContent('19:00');

    await userEvent.click(screen.getByRole('button', { name: 'Fecha' }));
    await userEvent.click(await day(26));
    await next();
    await screen.findByRole('heading', { name: '¿A qué hora?' });
    expect(screen.getByRole('complementary')).not.toHaveTextContent('19:00');
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('going back keeps the data and marks the current step', async () => {
    mockApi();
    renderWizard();
    await reachTime();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Hora');
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    await screen.findByRole('heading', { name: '¿Qué día?' });
    expect((await day(25)).closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('moves focus to the step heading when the step changes', async () => {
    mockApi();
    renderWizard();
    await pickParty(2);
    await next();
    const heading = await screen.findByRole('heading', { name: '¿Qué día?' });
    expect(heading).toHaveFocus();
  });

  it('a full slot (409) returns to the time step with an alert and refetches the slots', async () => {
    const calls = mockApi((call) =>
      call.method === 'POST'
        ? Response.json({ error: { code: 'SLOT_FULL' } }, { status: 409 })
        : undefined,
    );
    renderWizard();
    await reachDetails();
    await fillDetails();
    const before = calls.filter((c) => c.search.has('date')).length;
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await screen.findByRole('heading', { name: '¿A qué hora?' });
    expect(screen.getByRole('alert')).toHaveTextContent(/ya no está disponible/i);
    await waitFor(() =>
      expect(calls.filter((c) => c.search.has('date')).length).toBeGreaterThan(before),
    );
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('shows a generic message on 429 and a retry message on network errors', async () => {
    let mode: 'limit' | 'network' = 'limit';
    mockApi((call) => {
      if (call.method !== 'POST') return undefined;
      if (mode === 'network') throw new TypeError('Failed to fetch');
      return Response.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
    });
    renderWizard();
    await reachDetails();
    await fillDetails();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/demasiados intentos/i);
    mode = 'network';
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/conexión/i));
  });

  it('shows an accessible error summary for invalid fields and does not post', async () => {
    const calls = mockApi();
    renderWizard();
    await reachDetails();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveFocus();
    expect(within(summary).getByRole('link', { name: 'Nombre' })).toBeVisible();
    expect(within(summary).getByRole('link', { name: 'Teléfono' })).toBeVisible();
    expect(within(summary).getByRole('link', { name: 'Privacidad' })).toBeVisible();
    expect(screen.getByLabelText(/^Nombre/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Nombre/)).toHaveAccessibleDescription(/obligatorio/i);
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await userEvent.click(within(summary).getByRole('link', { name: 'Nombre' }));
    expect(screen.getByLabelText(/^Nombre/)).toHaveFocus();
  });

  it('maps server field errors (400) onto the form', async () => {
    mockApi((call) =>
      call.method === 'POST'
        ? Response.json(
            { error: { code: 'VALIDATION_ERROR', details: { phone: ['validation.phone'] } } },
            { status: 400 },
          )
        : undefined,
    );
    renderWizard();
    await reachDetails();
    await fillDetails();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    const summary = await screen.findByRole('alert');
    expect(within(summary).getByRole('link', { name: 'Teléfono' })).toBeVisible();
    expect(screen.getByLabelText(/^Teléfono/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('has a hidden honeypot and a privacy link, and counts the comment', async () => {
    mockApi();
    renderWizard();
    await reachDetails();
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot).toHaveAttribute('autocomplete', 'off');
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /^política de privacidad/ })).toHaveAttribute(
      'href',
      '/es/privacidad',
    );
    await userEvent.type(screen.getByLabelText(/^Comentario/), 'Hola');
    expect(screen.getByText('4/500')).toBeVisible();
    expect(screen.getByLabelText(/^Comentario/)).toHaveAccessibleDescription(
      /Indica solo lo necesario.*4\/500/,
    );
  });

  it('renders in German', async () => {
    await i18n.changeLanguage('de');
    const calls = mockApi();
    renderWizard();
    await screen.findByRole('heading', { name: 'Wie viele Personen?' });
    await screen.findByRole('radio', { name: '2 Personen' });
    expect(screen.getByRole('radio', { name: '1 Person' })).toBeVisible();
    await reachDetails();
    await userEvent.type(screen.getByLabelText(/^Name/), 'Anna Beispiel');
    await userEvent.type(screen.getByLabelText(/^E-Mail/), 'anna@example.com');
    await userEvent.type(screen.getByLabelText(/^Telefon/), '0421 123456');
    await userEvent.click(screen.getByRole('checkbox', { name: /Datenschutz/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Anfrage senden' }));
    await screen.findByRole('heading', { name: /Anfrage erhalten/ });
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({ lang: 'de' });
    expect(screen.getByRole('link', { name: /Zur Startseite/ })).toHaveAttribute('href', '/de');
  });

  it('shows a retry when the availability cannot be loaded', async () => {
    mockApi(() => Response.json({ error: { code: 'X' } }, { status: 500 }));
    renderWizard();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar/);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});

describe('ReservationWizard fixes', () => {
  it('opens the details step without any validation error shown', async () => {
    mockApi();
    renderWizard();
    await reachDetails();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText(/^Nombre/)).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText(/Este campo es obligatorio/)).toBeNull();
  });

  it('still sends the request when autofill filled the honeypot, with its real value', async () => {
    const calls = mockApi();
    renderWizard();
    await reachDetails();
    await fillDetails();
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]');
    await userEvent.type(honeypot as HTMLInputElement, 'http://spam.example');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    await screen.findByRole('heading', { name: /Solicitud recibida/ });
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      website: 'http://spam.example',
    });
  });

  it('shows a generic alert when the server rejects a field outside the details step', async () => {
    mockApi((call) =>
      call.method === 'POST'
        ? Response.json(
            { error: { code: 'VALIDATION_ERROR', details: { date: ['validation.date'] } } },
            { status: 400 },
          )
        : undefined,
    );
    renderWizard();
    await reachDetails();
    await fillDetails();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo enviar/);
  });

  it('names the privacy checkbox with the full sentence including the link text', async () => {
    mockApi();
    renderWizard();
    await reachDetails();
    expect(screen.getByRole('checkbox', { name: /política de privacidad/i })).toBeVisible();
  });

  it('shows a hint instead of dashes before anything is chosen', async () => {
    mockApi();
    renderWizard();
    expect(await screen.findByText('Elige el número de personas')).toBeInTheDocument();
  });
});
