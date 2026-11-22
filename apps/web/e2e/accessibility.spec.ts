import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Normas que exige la ley alemana (BFSG / EN 301 549 ≈ WCAG 2.1 AA) y WCAG 2.2 AA. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const lang of ['de', 'es'] as const) {
  test(`/${lang} no tiene infracciones de accesibilidad WCAG 2.2 AA`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${lang}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

for (const path of ['/de/speisekarte', '/es/carta']) {
  test(`${path} no tiene infracciones de accesibilidad WCAG 2.2 AA`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Esperar a los datos (o al estado vacío): sin el skeleton de carga.
    await expect(page.getByTestId('menu-loading')).toHaveCount(0);

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test('el menú móvil abierto también es accesible', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Menú hamburguesa: solo móvil');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/de');
  await page.getByRole('button', { name: 'Menü öffnen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
