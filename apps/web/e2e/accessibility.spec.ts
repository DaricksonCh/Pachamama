import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Normas que exige la ley alemana (BFSG / EN 301 549 ≈ WCAG 2.1 AA) y WCAG 2.2 AA. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const lang of ['de', 'es'] as const) {
  test(`/${lang} no tiene infracciones de accesibilidad WCAG 2.2 AA`, async ({ page }) => {
    await page.goto(`/${lang}`);
    await expect(page.getByRole('status')).toHaveAttribute('aria-busy', 'false');

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test('el estado de carga también es accesible', async ({ page }) => {
  await page.route('**/api/v1/health', () => new Promise(() => {}));
  await page.goto('/de');
  await expect(page.getByRole('status')).toHaveAttribute('aria-busy', 'true');

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
