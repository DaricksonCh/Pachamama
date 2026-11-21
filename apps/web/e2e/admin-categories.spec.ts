import { expect, type Page, test } from '@playwright/test';
import { axeViolations, signIn, useOwnIp } from './admin-helpers';
import { E2E_STAFF } from './fixtures';

/** Nombre único por test y proyecto: escritorio y móvil comparten la BD de pruebas. */
function uniqueName(label: string) {
  const info = test.info();
  return `${label} ${info.project.name} ${Date.now() % 1_000_000}${info.retry}`;
}

/** Llama a la API con la sesión del navegador (el navegador añade el Origin que exige el CSRF). */
async function api(page: Page, method: string, path: string, body: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data: { id: number } };
      if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
      return json;
    },
    { method, path, body },
  );
}

async function createCategory(page: Page, name: string) {
  const { data } = await api(page, 'POST', '/api/v1/admin/menu/categories', {
    nameDe: name,
    nameEs: name,
    status: 'visible',
  });
  return data.id;
}

async function createDish(page: Page, categoryId: number, name: string) {
  await api(page, 'POST', '/api/v1/admin/menu/dishes', {
    categoryId,
    nameDe: name,
    nameEs: name,
    price: 9.5,
    diet: null,
    allergens: [],
    status: 'visible',
    isProvisional: false,
  });
}

const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

test.describe('panel /admin: categorías de la carta', () => {
  test.beforeEach(async ({ page }) => {
    await useOwnIp(page, 100);
  });

  test('el admin crea una categoría y edita su nombre', async ({ page }) => {
    const name = uniqueName('Postres');
    const renamed = `${name} bis`;
    await signIn(page);
    await page.goto('/admin/menu/categories');

    await page.getByRole('link', { name: 'Neue Kategorie' }).click();
    await expect(page).toHaveURL(/\/admin\/menu\/categories\/new$/);
    await page.getByLabel(/Name \(Deutsch\)/).fill(name);
    await page.getByLabel(/Name \(Spanisch\)/).fill(name);
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page).toHaveURL(/\/admin\/menu\/categories$/);
    await expect(row(page, name)).toBeVisible();

    await row(page, name)
      .getByRole('link', { name: /bearbeiten/ })
      .click();
    await page.getByLabel(/Name \(Deutsch\)/).fill(renamed);
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page).toHaveURL(/\/admin\/menu\/categories$/);
    await expect(row(page, renamed)).toBeVisible();
  });

  test('un formulario vacío marca los dos nombres como inválidos y enfoca el primero', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/admin/menu/categories/new');

    await page.getByRole('button', { name: 'Speichern' }).click();

    const de = page.getByLabel(/Name \(Deutsch\)/);
    await expect(de).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel(/Name \(Spanisch\)/)).toHaveAttribute('aria-invalid', 'true');
    await expect(de).toBeFocused();
  });

  test('sube y baja el orden de una categoría', async ({ page }) => {
    const first = uniqueName('Orden A');
    const second = uniqueName('Orden B');
    await signIn(page);
    await createCategory(page, first);
    await createCategory(page, second);
    await page.goto('/admin/menu/categories');
    await expect(row(page, first)).toBeVisible();
    await expect(row(page, second)).toBeVisible();

    const positions = async () => {
      const names = await page.locator('tbody tr td:first-child').allTextContents();
      return { first: names.indexOf(first), second: names.indexOf(second) };
    };
    const before = await positions();
    expect(before.first).toBeLessThan(before.second);

    // Otros tests crean categorías a la vez: si la lista queda desfasada la API rechaza el
    // orden, la página se recarga y el segundo intento ya va con la lista al día.
    await expect(async () => {
      await page.getByRole('button', { name: `${second} nach oben` }).click();
      await expect
        .poll(
          async () => {
            const p = await positions();
            return p.second < p.first;
          },
          { timeout: 3000 },
        )
        .toBe(true);
    }).toPass({ timeout: 20_000 });

    await expect(async () => {
      await page.getByRole('button', { name: `${second} nach unten` }).click();
      await expect
        .poll(
          async () => {
            const p = await positions();
            return p.first < p.second;
          },
          { timeout: 3000 },
        )
        .toBe(true);
    }).toPass({ timeout: 20_000 });
  });

  test('no deja archivar una categoría con platos y sí una vacía, que se restaura', async ({
    page,
  }) => {
    const full = uniqueName('Con platos');
    const empty = uniqueName('Vacia');
    await signIn(page);
    const fullId = await createCategory(page, full);
    await createDish(page, fullId, uniqueName('Plato'));
    await createCategory(page, empty);
    await page.goto('/admin/menu/categories');

    await page.getByRole('button', { name: `${full} archivieren` }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', { name: 'Archivieren' }).click();
    await expect(dialog.getByRole('alert')).toContainText('enthält noch Gerichte');
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(row(page, full)).toBeVisible();

    await page.getByRole('button', { name: `${empty} archivieren` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click();
    await expect(row(page, empty)).toHaveCount(0);

    await page.getByRole('button', { name: 'Archiviert' }).click();
    await expect(row(page, empty)).toBeVisible();
    await page.getByRole('button', { name: `${empty} wiederherstellen` }).click();
    await expect(row(page, empty)).toHaveCount(0);

    await page.getByRole('button', { name: 'Aktiv' }).click();
    await expect(row(page, empty)).toBeVisible();
  });

  test('el personal solo consulta: sin alta, edición, orden ni archivado', async ({ page }) => {
    const name = uniqueName('Solo lectura');
    await signIn(page);
    const id = await createCategory(page, name);
    await page.context().clearCookies();
    await signIn(page, E2E_STAFF);

    await page.goto('/admin/menu/categories');
    await expect(row(page, name)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Neue Kategorie' })).toHaveCount(0);
    await expect(row(page, name).getByRole('button')).toHaveCount(0);
    await expect(row(page, name).getByRole('link', { name: /bearbeiten/ })).toHaveCount(0);

    await row(page, name)
      .getByRole('link', { name: /ansehen/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`/admin/menu/categories/${id}$`));
    await expect(page.getByLabel(/Name \(Deutsch\)/)).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Speichern' })).toHaveCount(0);
  });

  test('listado y formulario cumplen WCAG 2.2 AA (de y es)', async ({ page }) => {
    const name = uniqueName('Accesible');
    await signIn(page);
    await createCategory(page, name);

    await page.goto('/admin/menu/categories');
    await expect(row(page, name)).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole('link', { name: 'Nueva categoría' }).click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByLabel(/Nombre \(alemán\)/)).toHaveAttribute('aria-invalid', 'true');
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole('button', { name: 'Deutsch' }).click();
    await expect(page.getByRole('heading', { name: 'Neue Kategorie' })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});
