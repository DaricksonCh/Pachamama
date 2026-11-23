import { switchLanguage } from './language-helpers';
import { expect, test } from '@playwright/test';

const CASES = [
  {
    lang: 'de',
    open: 'Menü öffnen',
    story: 'Geschichte',
    contact: 'Kontakt',
    storyUrl: /\/de\/geschichte$/,
    contactUrl: /\/de\/kontakt$/,
    storyH1: 'Unsere Geschichte',
    contactH1: 'Kontakt und Anfahrt',
  },
  {
    lang: 'es',
    open: 'Abrir menú',
    story: 'Historia',
    contact: 'Contacto',
    storyUrl: /\/es\/historia$/,
    contactUrl: /\/es\/contacto$/,
    storyH1: 'Nuestra historia',
    contactH1: 'Contacto y cómo llegar',
  },
] as const;

test.describe('páginas públicas: Geschichte/Historia y Kontakt/Contacto', () => {
  for (const c of CASES) {
    test(`la navegación principal llega a historia y contacto (${c.lang})`, async ({
      page,
      isMobile,
    }) => {
      await page.goto(`/${c.lang}`);
      const openNav = async () => {
        if (isMobile) await page.getByRole('button', { name: c.open }).click();
        return isMobile ? page.getByRole('dialog') : page.getByRole('banner');
      };

      await (await openNav()).getByRole('link', { name: c.story, exact: true }).click();
      await expect(page).toHaveURL(c.storyUrl);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.storyH1);

      await (await openNav()).getByRole('link', { name: c.contact, exact: true }).click();
      await expect(page).toHaveURL(c.contactUrl);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.contactH1);
    });
  }

  test('el cambio de idioma en /de/kontakt lleva a /es/contacto', async ({ page, isMobile }) => {
    await page.goto('/de/kontakt');
    if (isMobile) await page.getByRole('button', { name: 'Menü öffnen' }).click();
    await switchLanguage(page, 'Español');
    await expect(page).toHaveURL(/\/es\/contacto$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contacto y cómo llegar');
  });

  test('/de/kontakt muestra el horario del panel con quipu, estado y datos de contacto', async ({
    page,
  }) => {
    const hours = page.waitForResponse((r) => r.url().endsWith('/api/v1/opening-hours'));
    await page.goto('/de/kontakt');
    expect((await hours).status()).toBe(200);

    const block = page.getByRole('region', { name: 'Wann wir für Sie kochen' });
    await block.scrollIntoViewIfNeeded();
    await expect(block.getByTestId('opening-status')).toHaveText(
      /Jetzt geöffnet|Heute ab|Gerade geschlossen|Geschlossen bis/,
    );
    await expect(block.getByText('Montag', { exact: true })).toBeVisible();
    await expect(block.getByTestId('quipu')).toBeVisible();
    await expect(block.getByRole('link', { name: /\+49 1521 4982818/ })).toHaveAttribute(
      'href',
      'tel:+4915214982818',
    );
    await expect(
      block.getByRole('link', { name: /pachamamarestaurantperu@gmail\.com/ }),
    ).toBeVisible();
  });

  test('/de/kontakt no hace peticiones a terceros (DSGVO)', async ({ page, baseURL }) => {
    const external: string[] = [];
    const origin = new URL(baseURL ?? 'http://localhost').origin;
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith(origin) && !url.startsWith('data:')) external.push(url);
    });

    await page.goto('/de/kontakt');
    const map = page.getByRole('img', { name: /Karte der Umgebung/ });
    await map.scrollIntoViewIfNeeded();
    await expect
      .poll(() => map.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);

    expect(external).toEqual([]);
  });
});

const LEGAL = [
  {
    lang: 'de',
    imprintLink: 'Impressum',
    privacyLink: 'Datenschutz',
    imprintUrl: /\/de\/impressum$/,
    privacyUrl: /\/de\/datenschutz$/,
    imprintH1: 'Impressum',
    privacyH1: 'Datenschutzerklärung',
  },
  {
    lang: 'es',
    imprintLink: 'Aviso legal',
    privacyLink: 'Privacidad',
    imprintUrl: /\/es\/aviso-legal$/,
    privacyUrl: /\/es\/privacidad$/,
    imprintH1: 'Aviso legal',
    privacyH1: 'Política de privacidad',
  },
] as const;

test.describe('páginas legales: Impressum y Datenschutz', () => {
  for (const c of LEGAL) {
    test(`el pie de página llega a Impressum y Datenschutz (${c.lang})`, async ({ page }) => {
      await page.goto(`/${c.lang}`);
      const footer = page.getByRole('contentinfo');

      await footer.getByRole('link', { name: c.imprintLink, exact: true }).click();
      await expect(page).toHaveURL(c.imprintUrl);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.imprintH1);

      await page
        .getByRole('contentinfo')
        .getByRole('link', { name: c.privacyLink, exact: true })
        .click();
      await expect(page).toHaveURL(c.privacyUrl);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.privacyH1);
    });
  }

  for (const c of [
    { from: '/de/impressum', to: /\/es\/aviso-legal$/, h1: 'Aviso legal' },
    { from: '/de/datenschutz', to: /\/es\/privacidad$/, h1: 'Política de privacidad' },
  ]) {
    test(`el cambio de idioma en ${c.from} conserva la página legal`, async ({
      page,
      isMobile,
    }) => {
      await page.goto(c.from);
      if (isMobile) await page.getByRole('button', { name: 'Menü öffnen' }).click();
      await switchLanguage(page, 'Español');
      await expect(page).toHaveURL(c.to);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.h1);
    });
  }
});

test('la portada muestra las secciones en orden: historia, cocina y visita', async ({ page }) => {
  await page.goto('/de');
  const titles = page.locator('main h2');
  await expect(titles).toHaveText([
    // Story and kitchen copy are placeholders until the real texts arrive (ADR 0015).
    'Lorem ipsum dolor sit amet',
    'Lorem ipsum dolor',
    'Besuchen Sie uns',
  ]);
  await expect(page.getByRole('link', { name: 'Unsere Geschichte lesen' })).toHaveAttribute(
    'href',
    '/de/geschichte',
  );
  await expect(page.getByRole('heading', { level: 3 })).toHaveText([
    'Ceviche Clásico',
    'Lomo Saltado',
    'Causa Limeña',
  ]);
});

test('la portada muestra el horario del panel: estado de hoy y resumen de la semana', async ({
  page,
}) => {
  // e2e:seed leaves Tuesday–Sunday 13:00–22:00 and no closures.
  await page.goto('/de');
  await expect(page.getByTestId('home-opening-status')).toHaveText(
    /^(Jetzt geöffnet|Heute ab|Heute Ruhetag|Gerade geschlossen)/,
  );
  await expect(page.getByTestId('home-hours-summary').getByRole('listitem')).toHaveText([
    'Di–So 13:00–22:00',
    'Mo Ruhetag',
  ]);
});

test('la galería de Historia avanza con las flechas y los puntos', async ({ page }) => {
  await page.goto('/es/historia');
  const gallery = page.getByRole('region', { name: 'Momentos' });
  await gallery.scrollIntoViewIfNeeded();
  const live = gallery.locator('[aria-live]');
  await expect(live).toHaveText('Foto 1 de 8');

  await gallery.getByRole('button', { name: 'Foto siguiente' }).click();
  await expect(live).toHaveText('Foto 2 de 8');
  await expect(gallery.getByRole('button', { name: 'Ir a la foto 2' })).toHaveAttribute(
    'aria-current',
    'true',
  );

  await gallery.getByRole('button', { name: 'Ir a la foto 5' }).click();
  await expect(live).toHaveText('Foto 5 de 8');
  await expect(gallery.getByRole('img', { name: /quinua/i })).toBeInViewport();

  // From the last photo the next arrow wraps to the first; each move lands on its photo.
  await gallery.getByRole('button', { name: 'Ir a la foto 8' }).click();
  await gallery.getByRole('button', { name: 'Foto siguiente' }).click();
  await expect(live).toHaveText('Foto 1 de 8');
  await expect(gallery.getByRole('img', { name: /Vista del comedor/ })).toBeInViewport();
  await gallery.getByRole('button', { name: 'Ir a la foto 3' }).click();
  await expect(live).toHaveText('Foto 3 de 8');
  // The third slide is aligned with the start of the track (horizontal position only:
  // clicking a dot may scroll the page vertically and crop the photo at the bottom).
  await expect
    .poll(() =>
      gallery.locator('ul').evaluate((ul) => {
        const slide = ul.children[2] as HTMLElement;
        return Math.abs(
          slide.getBoundingClientRect().left -
            ul.getBoundingClientRect().left -
            parseFloat(getComputedStyle(ul).paddingLeft),
        );
      }),
    )
    .toBeLessThan(2);
  await expect(gallery.getByRole('img', { name: /Vista del comedor/ })).not.toBeInViewport();
});
