import { expect, test } from '@playwright/test';

test.describe('flujo de usuario: idioma y navegación', () => {
  test('la raíz redirige a alemán y muestra la API conectada', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/de$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Willkommen bei Pachamama');
    await expect(page.getByRole('status')).toContainText('Verbunden');
  });

  test('el usuario cambia a español y vuelve a alemán', async ({ page }) => {
    await page.goto('/de');

    await page.getByRole('link', { name: 'Español' }).click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bienvenidos a Pachamama');
    await expect(page.getByRole('link', { name: 'Español' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await page.getByRole('link', { name: 'Deutsch' }).click();
    await expect(page).toHaveURL(/\/de$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Willkommen bei Pachamama');
  });

  test('el cambio de idioma funciona solo con teclado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Navegación con teclado: solo escritorio');
    await page.goto('/de');

    // Tabular hasta el enlace "Español" y activarlo con Enter.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      if (focused === 'Español') break;
    }
    await expect(page.getByRole('link', { name: 'Español' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/es$/);
  });

  test('un idioma no soportado redirige al alemán', async ({ page }) => {
    await page.goto('/fr');
    await expect(page).toHaveURL(/\/de$/);
  });

  test('una ruta desconocida redirige al inicio', async ({ page }) => {
    await page.goto('/de/no-existe/para-nada');
    await expect(page).toHaveURL(/\/de$/);
  });

  test('la página no produce errores en consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/de');
    await expect(page.getByRole('status')).toContainText('Verbunden');
    await page.goto('/es');
    await expect(page.getByRole('status')).toContainText('Conectada');

    expect(errors).toEqual([]);
  });
});
