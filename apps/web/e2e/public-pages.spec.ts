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
    await page.getByRole('link', { name: 'Español' }).click();
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
    await expect(page.getByRole('img', { name: /Karte der Umgebung/ })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');

    expect(external).toEqual([]);
  });
});
