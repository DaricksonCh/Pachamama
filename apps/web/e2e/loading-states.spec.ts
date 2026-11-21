import { expect, test } from '@playwright/test';

const HEALTH = '**/api/v1/health';

test.describe('estados de carga y de error', () => {
  test('muestra un skeleton mientras la API tarda y luego el resultado', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));

    await page.route(HEALTH, async (route) => {
      await gate;
      await route.continue();
    });

    await page.goto('/de');

    const status = page.getByRole('status');
    await expect(status).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByTestId('skeleton')).toHaveCount(2);
    await expect(status).toContainText('Wird geprüft');

    release();

    await expect(status).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByTestId('skeleton')).toHaveCount(0);
    await expect(status).toContainText('Verbunden');
  });

  test('el skeleton no anima si el usuario pide menos movimiento', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(HEALTH, () => new Promise(() => {})); // nunca responde

    await page.goto('/de');
    const skeleton = page.getByTestId('skeleton').first();
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveCSS('animation-name', 'none');
  });

  test('muestra un error comprensible si la API no responde', async ({ page }) => {
    await page.route(HEALTH, (route) => route.abort('connectionrefused'));

    await page.goto('/es');
    await expect(page.getByRole('status')).toContainText('No disponible', { timeout: 15_000 });
  });

  test('muestra error si la API devuelve datos inválidos (validación Zod)', async ({ page }) => {
    await page.route(HEALTH, (route) =>
      route.fulfill({ json: { status: 'hacked', injected: '<script>alert(1)</script>' } }),
    );

    await page.goto('/de');
    await expect(page.getByRole('status')).toContainText('Nicht erreichbar', { timeout: 15_000 });
    await expect(page.locator('script', { hasText: 'alert(1)' })).toHaveCount(0);
  });
});
