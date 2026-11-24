import { switchLanguage } from './language-helpers';
import { expect, test } from '@playwright/test';

const TITLE_DE = 'Peruanische Küche mitten in Bremen';
const TITLE_ES = 'Cocina peruana en pleno Bremen';

test.describe('flujo de usuario: idioma y navegación', () => {
  test('la raíz redirige a alemán', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/de$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE_DE);
  });

  test('el usuario cambia a español y vuelve a alemán', async ({ page, isMobile }) => {
    await page.goto('/de');
    if (isMobile) await page.getByRole('button', { name: 'Menü öffnen' }).click();

    await switchLanguage(page, 'Español');
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE_ES);

    if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
    const trigger = page.getByRole('button', { name: 'Idioma: ES' }).filter({ visible: true });
    await expect(trigger.locator('[data-flag="es"]')).toBeVisible();
    await trigger.click();
    await expect(page.getByRole('menuitem', { name: 'Español' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await page.getByRole('menuitem', { name: 'Deutsch' }).click();
    await expect(page).toHaveURL(/\/de$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE_DE);
  });

  test('cada vista nueva se abre arriba aunque la anterior estuviera bajada', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/de');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    if (isMobile) await page.getByRole('button', { name: 'Menü öffnen' }).click();
    await page
      .getByRole('link', { name: 'Geschichte', exact: true })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/de\/geschichte$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('el cambio de idioma funciona solo con teclado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Navegación con teclado: solo escritorio');
    await page.goto('/de');

    // Tabular hasta el selector de idioma (tras el salto al contenido, logo, menú e Instagram).
    const trigger = page.getByRole('button', { name: 'Sprache: DE' });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      if (await trigger.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Deutsch' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Español' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/es$/);
  });

  test('el botón Reservar de la portada lleva al asistente de reservas', async ({ page }) => {
    await page.goto('/de');
    const hero = page.getByRole('region', { name: TITLE_DE });
    await expect(hero.getByRole('link', { name: /Tisch reservieren/ })).toHaveAttribute(
      'href',
      '/de/reservieren',
    );
  });

  test('el menú móvil se abre y navega', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Menú hamburguesa: solo móvil');
    await page.goto('/es');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('link', { name: 'Carta' })).toHaveAttribute('href', '/es/carta');
    await expect(dialog.getByRole('link', { name: /Reservar mesa/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('un idioma no soportado redirige al alemán', async ({ page }) => {
    await page.goto('/fr');
    await expect(page).toHaveURL(/\/de$/);
  });

  test('una ruta desconocida redirige al inicio', async ({ page }) => {
    await page.goto('/de/no-existe/para-nada');
    await expect(page).toHaveURL(/\/de$/);
  });

  test('sin errores en consola ni peticiones a terceros (DSGVO)', async ({ page, baseURL }) => {
    const errors: string[] = [];
    const external: string[] = [];
    const origin = new URL(baseURL ?? 'http://localhost').origin;
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith(origin) && !url.startsWith('data:')) external.push(url);
    });

    await page.goto('/de');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE_DE);
    await page.goto('/es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE_ES);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.images]
            // Lazy images below the fold are not requested yet, only the visible ones matter.
            .filter((img) => img.getBoundingClientRect().top < window.innerHeight)
            .every((img) => img.complete && img.naturalWidth > 0),
        ),
      )
      .toBe(true);

    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
});
