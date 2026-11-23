import { expect, type Locator, type Page, test } from '@playwright/test';
import { axeViolations, row, signIn, uniqueName, useOwnIp } from './admin-helpers';
import { E2E_STAFF } from './fixtures';

type Lang = 'de' | 'es';

/** Textos del flujo público por idioma (los mismos que los archivos de locales). */
const TEXT = {
  de: {
    path: '/de/reservieren',
    party: '2 Personen',
    next: 'Weiter',
    submit: 'Anfrage senden',
    name: 'Name',
    email: 'E-Mail',
    phone: 'Telefon',
    privacy: /Ich habe die/,
    success: 'Anfrage erhalten',
    heading: { date: 'Welcher Tag?', time: 'Welche Uhrzeit?', details: 'Ihre Angaben' },
    cta: 'Tisch reservieren',
  },
  es: {
    path: '/es/reservar',
    party: '2 personas',
    next: 'Siguiente',
    submit: 'Enviar solicitud',
    name: 'Nombre',
    email: 'Email',
    phone: 'Teléfono',
    privacy: /He leído/,
    success: 'Solicitud recibida',
    heading: { date: '¿Qué día?', time: '¿A qué hora?', details: 'Tus datos' },
    cta: 'Reservar mesa',
  },
} as const;

/**
 * Hora distinta por idioma y proyecto: escritorio y móvil comparten BD y corren en paralelo.
 * (El aforo es de 30 por franja, así que es solo un cinturón de seguridad.)
 */
function slotIndex(lang: Lang) {
  const mobile = test.info().project.name === 'mobile' ? 2 : 0;
  return mobile + (lang === 'es' ? 1 : 0) + test.info().retry * 4;
}

/** Primer día habilitado a 3 o más días vista; pasa al mes siguiente si no queda ninguno. */
async function pickDate(page: Page, how: 'click' | 'keyboard' = 'click') {
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + 3);
  const minIso = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}-${String(earliest.getDate()).padStart(2, '0')}`;
  const enabled = page.locator('td[data-day]:not([data-disabled]) button:not([disabled])');
  await expect(enabled.first()).toBeVisible();
  const nextMonth = page.getByRole('button', {
    name: /^(Nächster Monat|Mes siguiente|Next month)/i,
  });

  for (let month = 0; month < 3; month++) {
    const days = await page
      .locator('td[data-day]:not([data-disabled])')
      .evaluateAll((cells) => cells.map((c) => c.getAttribute('data-day') ?? ''));
    const iso = days.find((d) => d >= minIso);
    if (iso) {
      const button = page.locator(`td[data-day="${iso}"] button`);
      if (how === 'click') await button.click();
      return iso;
    }
    await nextMonth.click();
    await expect(enabled.first()).toBeVisible();
  }
  throw new Error('No hay ningún día reservable en los próximos meses');
}

async function pickTime(page: Page, lang: Lang) {
  const slots = page.getByRole('radio').filter({ hasText: /^\d{2}:\d{2}/ });
  await expect(slots.first()).toBeVisible();
  const total = await slots.count();
  const slot = slots.nth(slotIndex(lang) % total);
  const time = ((await slot.textContent()) ?? '').slice(0, 5);
  await slot.click();
  return time;
}

async function fillDetails(page: Page, lang: Lang, name: string) {
  const t = TEXT[lang];
  await page.getByLabel(t.name, { exact: false }).first().fill(name);
  await page.getByLabel(t.email, { exact: false }).fill('e2e-gast@example.com');
  await page.getByLabel(t.phone, { exact: false }).fill('+49 421 1234567');
  await page.getByRole('checkbox').check();
}

/** Recorre el asistente con el ratón; opcionalmente comprueba axe en cada paso. */
async function bookWithMouse(page: Page, lang: Lang, name: string, withAxe = false) {
  const t = TEXT[lang];
  const check = async () => {
    if (withAxe) expect(await axeViolations(page)).toEqual([]);
  };
  await page.goto(t.path);
  const next = page.getByRole('button', { name: t.next, exact: true });

  await page.getByRole('radio', { name: t.party, exact: true }).click();
  await check();
  await next.click();

  await expect(page.getByRole('heading', { name: t.heading.date })).toBeVisible();
  const date = await pickDate(page);
  await check();
  await next.click();

  await expect(page.getByRole('heading', { name: t.heading.time })).toBeVisible();
  const time = await pickTime(page, lang);
  await check();
  await next.click();

  await expect(page.getByRole('heading', { name: t.heading.details })).toBeVisible();
  await fillDetails(page, lang, name);
  await check();
  await page.getByRole('button', { name: t.submit }).click();

  await expect(page.getByRole('heading', { name: t.success })).toBeVisible();
  await check();
  return { date, time };
}

for (const lang of ['de', 'es'] as const) {
  test(`reservar una mesa de principio a fin y sin fallos de accesibilidad (${lang})`, async ({
    page,
  }) => {
    test.slow(); // 5 pasos con axe en cada uno
    await useOwnIp(page, 1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const { time } = await bookWithMouse(page, lang, uniqueName('Gast'), true);
    await expect(page.getByText(time, { exact: true })).toBeVisible();
  });
}

test('el asistente se completa solo con el teclado (de)', async ({ page }) => {
  test.slow();
  const lang: Lang = 'de';
  const t = TEXT[lang];
  await useOwnIp(page, 1);
  await page.goto(t.path);

  /** Tab hasta que el foco llegue al elemento (falla si no llega en 80 pulsaciones). */
  const tabTo = async (target: Locator) => {
    for (let i = 0; i < 80; i++) {
      if (await target.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press('Tab');
    }
    throw new Error('El foco no llegó al elemento con Tab');
  };

  // Roving tabindex: Tab entra en la primera opción (1 persona) y la flecha llega a la de 2.
  await tabTo(page.getByRole('radio').first());
  await page.keyboard.press('ArrowRight');
  // Radix mueve el foco de forma asíncrona: esperar a que llegue antes de pulsar Espacio.
  await expect(page.getByRole('radio', { name: t.party, exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: t.party, exact: true })).toBeChecked();
  await tabTo(page.getByRole('button', { name: t.next, exact: true }));
  await page.keyboard.press('Enter');

  // Calendario: el foco entra en el primer día habilitado y las flechas lo mueven una semana.
  await expect(page.getByRole('heading', { name: t.heading.date })).toBeFocused();
  await expect(page.locator('td[data-day]:not([data-disabled]) button').first()).toBeVisible();
  await tabTo(page.locator('td[data-day] button:focus, td[data-day] button[tabindex="0"]').first());
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('td[data-day][aria-selected="true"]')).toHaveCount(1);
  await tabTo(page.getByRole('button', { name: t.next, exact: true }));
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: t.heading.time })).toBeFocused();
  const firstSlot = page
    .getByRole('radio')
    .filter({ hasText: /^\d{2}:\d{2}/ })
    .first();
  await expect(firstSlot).toBeVisible();
  await tabTo(firstSlot);
  await page.keyboard.press('ArrowRight');
  const secondSlot = page
    .getByRole('radio')
    .filter({ hasText: /^\d{2}:\d{2}/ })
    .nth(1);
  await expect(secondSlot).toBeFocused();
  await page.keyboard.press('Space');
  await expect(secondSlot).toBeChecked();
  await tabTo(page.getByRole('button', { name: t.next, exact: true }));
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: t.heading.details })).toBeFocused();
  await tabTo(page.getByLabel(t.name, { exact: false }).first());
  await page.keyboard.type(uniqueName('Teclado'));
  await page.keyboard.press('Tab');
  await page.keyboard.type('e2e-teclado@example.com');
  await page.keyboard.press('Tab');
  await page.keyboard.type('+49 421 7654321');
  await tabTo(page.getByRole('checkbox'));
  await page.keyboard.press('Space');
  await tabTo(page.getByRole('button', { name: t.submit }));
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: t.success })).toBeFocused();
});

test('tras «Weiter» en el paso de la hora, el paso de datos no muestra errores (regresión)', async ({
  page,
}) => {
  const lang: Lang = 'de';
  const t = TEXT[lang];
  await useOwnIp(page, 1);
  await page.goto(t.path);

  await page.getByRole('radio', { name: t.party, exact: true }).click();
  await page.getByRole('button', { name: t.next, exact: true }).click();
  await pickDate(page);
  await page.getByRole('button', { name: t.next, exact: true }).click();
  await pickTime(page, lang);
  await page.getByRole('button', { name: t.next, exact: true }).click();

  await expect(page.getByRole('heading', { name: t.heading.details })).toBeVisible();
  await expect(page.locator('form [aria-invalid="true"]')).toHaveCount(0);
  await expect(page.locator('form [role="alert"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: t.submit })).toBeEnabled();
});

test.describe('panel de reservas', () => {
  test('el admin confirma una reserva con el mensaje editado', async ({ page }) => {
    test.slow(); // reserva + panel con axe
    await useOwnIp(page, 1);
    const name = uniqueName('Gast');
    const { date, time } = await bookWithMouse(page, 'de', name);

    await signIn(page);
    await page.goto(`/admin/reservations?date=${date}`);
    await expect(row(page, name)).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);

    await row(page, name)
      .getByRole('link', { name: `Reservierung von ${name} ansehen` })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(name) })).toBeVisible();
    await expect(page.getByText('Offen', { exact: true }).first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole('button', { name: 'Bestätigen', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const body = dialog.getByLabel('Nachricht an den Gast');
    await expect(body).toHaveValue(new RegExp(`um ${time} Uhr`));
    await expect(body).toHaveValue(/Herzliche Grüße/);
    await body.focus();
    await body.press('Control+End');
    await body.pressSequentially(' Wir freuen uns!');
    await expect(body).toHaveValue(/ Wir freuen uns!$/);
    expect(await axeViolations(page)).toEqual([]);

    await dialog.getByRole('button', { name: 'Senden und bestätigen' }).click();
    await expect(page.getByText('Änderung gespeichert und E-Mail gesendet.')).toBeVisible();
    await expect(page.getByText('Bestätigt', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Wir freuen uns!' })).toBeVisible();
    await expect(page.getByText('E-Mail gesendet').first()).toBeVisible();
  });

  test('el personal ve las reservas pero no los ajustes', async ({ page }) => {
    await useOwnIp(page, 1);
    await signIn(page, E2E_STAFF);
    await page.goto('/admin/reservations');
    await expect(page.getByRole('heading', { level: 1, name: 'Reservierungen' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reservierungseinstellungen' })).toHaveCount(0);

    await page.goto('/admin/reservations/settings');
    await expect(page.getByText('Sie haben keine Berechtigung für diese Seite.')).toBeVisible();
  });
});

for (const lang of ['de', 'es'] as const) {
  test(`el botón de reservar del encabezado lleva al asistente (${lang})`, async ({
    page,
    isMobile,
  }) => {
    await page.goto(`/${lang}`);
    if (isMobile) {
      await page
        .getByRole('button', { name: lang === 'de' ? 'Menü öffnen' : 'Abrir menú' })
        .click();
    }
    const scope = isMobile ? page.getByRole('dialog') : page.getByRole('banner');
    const link = scope.getByRole('link', { name: TEXT[lang].cta });
    await expect(link).toHaveAttribute('href', TEXT[lang].path);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${TEXT[lang].path}$`));
  });
}
