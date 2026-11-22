import { expect, type Page, test } from '@playwright/test';
import { createCategory, createDish, signIn, uniqueName, useOwnIp } from './admin-helpers';

/** Creates a visible category with one dish through the admin API (the test DB is shared). */
async function seedMenu(page: Page) {
  const category = uniqueName('Entrada');
  const dish = uniqueName('Ceviche');
  await signIn(page);
  const categoryId = await createCategory(page, category);
  await createDish(page, categoryId, dish, { price: 12.9, allergens: ['D'], diet: 'vegetarian' });
  return { category, dish, categoryId };
}

const emptyMenu = { data: { categories: [] } };

test.describe('public menu page', () => {
  test.beforeEach(async ({ page }) => {
    await useOwnIp(page, 200);
  });

  test('shows categories, formatted prices and allergens in German and Spanish', async ({
    page,
  }) => {
    const { category, dish } = await seedMenu(page);

    await page.goto('/de/speisekarte');
    await expect(page.getByRole('heading', { level: 1, name: 'Speisekarte' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: category })).toBeVisible();
    const item = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: dish }) });
    await expect(item).toContainText('12,90');
    await expect(item.getByRole('list', { name: 'Allergene' })).toContainText('Fisch');
    await expect(item).toContainText('Vegetarisch');
    await expect(page.getByText('Fragen zu Allergenen?')).toBeVisible();

    await page.goto('/es/carta');
    await expect(page.getByRole('heading', { level: 1, name: 'Carta' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: category })).toBeVisible();
    const itemEs = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: dish }) });
    await expect(itemEs).toContainText('12,90');
    await expect(itemEs.getByRole('list', { name: 'Alérgenos' })).toContainText('Pescado');
    await expect(itemEs).toContainText('Vegetariano');
  });

  test('the category navigation jumps to its section below the sticky bar', async ({ page }) => {
    const { category } = await seedMenu(page);

    await page.goto('/de/speisekarte');
    const nav = page.getByRole('navigation', { name: 'Kategorien der Speisekarte' });
    const link = nav.getByRole('link', { name: category });
    await link.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#category-\d+$/);
    const heading = page.getByRole('heading', { level: 2, name: category });
    await expect(heading).toBeInViewport();
    await expect(heading).toBeFocused();
    await expect
      .poll(async () => {
        const navBox = await nav.boundingBox();
        const headingBox = await heading.boundingBox();
        return headingBox!.y >= navBox!.y + navBox!.height - 1;
      })
      .toBe(true);
  });

  test('the PDF link points to the PDF of the current language', async ({ page }) => {
    await page.goto('/de/speisekarte');
    const de = page.getByRole('link', { name: /Speisekarte als PDF/ });
    await expect(de).toHaveAttribute('href', '/api/v1/menu/pdf?lang=de');
    await expect(de).toHaveAttribute('target', '_blank');

    await page.goto('/es/carta');
    await expect(page.getByRole('link', { name: /Carta en PDF/ })).toHaveAttribute(
      'href',
      '/api/v1/menu/pdf?lang=es',
    );
  });

  test('shows an accessible skeleton while loading, without animation if motion is reduced', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/api/v1/menu', async (route) => {
      await gate;
      await route.continue();
    });

    try {
      await page.goto('/de/speisekarte');
      const loading = page.getByTestId('menu-loading');
      await expect(loading).toHaveAttribute('aria-busy', 'true');
      await expect(loading.getByRole('status')).toHaveText('Speisekarte wird geladen …');
      const skeleton = page.getByTestId('skeleton').first();
      await expect(skeleton).toBeVisible();
      await expect(skeleton).toHaveCSS('animation-name', 'none');

      release();
      await expect(loading).toHaveCount(0);
    } finally {
      release();
    }
  });

  test('shows an error when the API fails and recovers with retry', async ({ page }) => {
    await page.route('**/api/v1/menu', (route) => route.abort());
    await page.goto('/de/speisekarte');
    await expect(page.getByRole('alert')).toContainText('konnte nicht geladen werden');

    await page.unroute('**/api/v1/menu');
    await page.getByRole('button', { name: 'Erneut versuchen' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Kategorien der Speisekarte' }),
    ).toBeVisible();
  });

  test('shows a friendly empty state with the PDF link', async ({ page }) => {
    await page.route('**/api/v1/menu', (route) => route.fulfill({ json: emptyMenu }));
    await page.goto('/es/carta');

    await expect(page.getByText('Estamos actualizando la carta.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Carta en PDF/ })).toHaveCount(2);
  });
});
