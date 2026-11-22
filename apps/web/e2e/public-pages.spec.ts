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
