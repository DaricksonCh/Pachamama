import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect, type Page } from '@playwright/test';
import {
  axeViolations,
  createCategory,
  createDish,
  row,
  signIn,
  uniqueName,
  useOwnIp,
} from './admin-helpers';
import { E2E_STAFF } from './fixtures';

const PHOTO = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'dish.jpg');

/** Cada test falla si la página escribe errores en la consola o lanza excepciones. */
const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        // Antes de iniciar sesión, la comprobación de sesión (/api/v1/me) responde 401: es lo esperado.
        if (msg.text().includes('401') && msg.location().url.endsWith('/api/v1/me')) return;
        errors.push(`${msg.text()} (${msg.location().url})`);
      });
      page.on('pageerror', (err) => errors.push(err.message));
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

/** Listado filtrado por nombre: la BD de pruebas la comparten todos los tests. */
async function openList(page: Page, name: string) {
  await page.goto(`/admin/menu/dishes?q=${encodeURIComponent(name)}`);
  await expect(row(page, name)).toBeVisible();
}

test.describe('panel /admin: platos de la carta', () => {
  test.beforeEach(async ({ page }) => {
    await useOwnIp(page, 150);
  });

  test('el admin crea un plato con foto y lo ve en el listado con miniatura', async ({ page }) => {
    const category = uniqueName('Cat foto');
    const name = uniqueName('Lomo');
    await signIn(page);
    const categoryId = await createCategory(page, category);

    // Desde el listado filtrado por categoría, el plato nuevo ya llega con ella elegida.
    await page.goto(`/admin/menu/dishes?categoryId=${categoryId}`);
    await expect(page.getByText('Keine Gerichte passen zu diesen Filtern.')).toBeVisible();
    await page.getByRole('link', { name: 'Neues Gericht' }).click();
    await expect(page).toHaveURL(/\/admin\/menu\/dishes\/new\?categoryId=\d+$/);
    // La URL cambia antes de pintar el formulario: se espera a él (el listado también tiene "Kategorie").
    await expect(page.getByRole('heading', { name: 'Neues Gericht' })).toBeVisible();
    await expect(page.getByLabel(/^Kategorie/)).toHaveValue(String(categoryId));
    await expect(page.getByLabel(/^Kategorie/)).toContainText(category);
    await page.getByLabel(/^Name \(Deutsch\)/).fill(name);
    await page.getByLabel(/^Name \(Spanisch\)/).fill(name);
    await page.getByLabel(/^Preis/).fill('14,50');
    await page.getByRole('checkbox', { name: /^A / }).check();
    await page.getByLabel('Foto auswählen').setInputFiles(PHOTO);
    await expect(page.getByRole('img', { name: 'Vorschau des Fotos' })).toBeVisible();
    await page.getByLabel(/^Bildbeschreibung \(Deutsch\)/).fill('Lomo saltado auf dem Teller');
    await page.getByLabel(/^Bildbeschreibung \(Spanisch\)/).fill('Lomo saltado en el plato');
    await page.getByRole('button', { name: 'Speichern' }).click();

    // Vuelve al listado con el mismo filtro de categoría.
    await expect(page).toHaveURL(new RegExp(`/admin/menu/dishes\\?categoryId=${categoryId}$`));
    await expect(row(page, name)).toBeVisible();
    const thumbnail = row(page, name).locator('img');
    await expect(thumbnail).toHaveAttribute('src', /^\/uploads\//);
    await expect
      .poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(row(page, name)).toContainText('14,50');
  });

  test('editar el precio se refleja en la carta pública', async ({ page }) => {
    const name = uniqueName('Precio');
    await signIn(page);
    const categoryId = await createCategory(page, uniqueName('Cat precio'));
    const id = await createDish(page, categoryId, name);

    await openList(page, name);
    await row(page, name)
      .getByRole('link', { name: /bearbeiten/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`/admin/menu/dishes/${id}$`));
    await expect(page.getByLabel(/^Preis/)).toHaveValue('9,50');
    await page.getByLabel(/^Preis/).fill('12,90');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page).toHaveURL(/\/admin\/menu\/dishes\?q=/);
    await expect(row(page, name)).toContainText('12,90');

    const res = await page.request.get('/api/v1/menu');
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      data: { categories: { dishes: { id: number; price: number }[] }[] };
    };
    const dish = body.data.categories.flatMap((c) => c.dishes).find((d) => d.id === id);
    expect(dish?.price).toBe(12.9);
  });

  test('oculta y archiva un plato desde el listado', async ({ page }) => {
    const name = uniqueName('Archivar');
    await signIn(page);
    const categoryId = await createCategory(page, uniqueName('Cat archivar'));
    await createDish(page, categoryId, name);
    await openList(page, name);

    await page.getByRole('button', { name: `${name} verstecken` }).click();
    await expect(row(page, name)).toContainText('Versteckt');
    await expect(page.getByRole('button', { name: `${name} anzeigen` })).toBeVisible();

    await page.getByRole('button', { name: `${name} archivieren` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click();
    await expect(row(page, name)).toHaveCount(0);

    await page.getByLabel('Status').selectOption('archived');
    await expect(row(page, name)).toContainText('Archiviert');
    await expect(page).toHaveURL(/status=archived/);
  });

  test('busca por nombre y filtra los provisionales', async ({ page }) => {
    const provisional = uniqueName('Provisional');
    const final = uniqueName('Definitivo');
    await signIn(page);
    const categoryId = await createCategory(page, uniqueName('Cat filtros'));
    await createDish(page, categoryId, provisional, { isProvisional: true });
    await createDish(page, categoryId, final);

    await page.goto(`/admin/menu/dishes?categoryId=${categoryId}`);
    await expect(row(page, provisional)).toBeVisible();
    await expect(row(page, final)).toBeVisible();
    await expect(row(page, provisional)).toContainText('Vorläufig');

    // Casilla controlada por la URL: queda marcada cuando termina la navegación.
    await page.getByLabel('Nur vorläufige').click();
    await expect(page.getByLabel('Nur vorläufige')).toBeChecked();
    await expect(page).toHaveURL(/provisional=true/);
    await expect(row(page, final)).toHaveCount(0);
    await expect(row(page, provisional)).toBeVisible();
    await page.getByLabel('Nur vorläufige').click();
    await expect(page.getByLabel('Nur vorläufige')).not.toBeChecked();

    await page.getByLabel('Nach Name suchen').fill(final);
    await expect(page).toHaveURL(/q=/);
    await expect(row(page, provisional)).toHaveCount(0);
    await expect(row(page, final)).toBeVisible();

    // La URL conserva los filtros al recargar.
    await page.reload();
    await expect(page.getByLabel('Nach Name suchen')).toHaveValue(final);
    await expect(row(page, final)).toBeVisible();
  });

  test('el personal solo puede alternar Visible/Oculto', async ({ page }) => {
    const name = uniqueName('Personal');
    await signIn(page);
    const categoryId = await createCategory(page, uniqueName('Cat personal'));
    const id = await createDish(page, categoryId, name);
    await page.context().clearCookies();
    await signIn(page, E2E_STAFF);

    await openList(page, name);
    await expect(page.getByRole('link', { name: 'Neues Gericht' })).toHaveCount(0);
    await expect(row(page, name).getByRole('button')).toHaveCount(1);
    await row(page, name)
      .getByRole('button', { name: `${name} verstecken` })
      .click();
    await expect(row(page, name)).toContainText('Versteckt');

    await row(page, name)
      .getByRole('link', { name: /ansehen/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`/admin/menu/dishes/${id}$`));
    await expect(page.getByLabel(/^Name \(Deutsch\)/)).toBeDisabled();
    await expect(page.getByLabel(/^Preis/)).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Speichern' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Archivieren' })).toHaveCount(0);
    const visible = page.getByRole('switch', { name: 'In der Speisekarte sichtbar' });
    await expect(visible).not.toBeChecked();
    await visible.click();
    await expect(page.getByRole('switch', { name: 'In der Speisekarte sichtbar' })).toBeChecked();
  });

  test('avisa al salir con cambios sin guardar', async ({ page }) => {
    await signIn(page);
    const categoryId = await createCategory(page, uniqueName('Cat salir'));
    await page.goto(`/admin/menu/dishes?categoryId=${categoryId}`);
    await page.getByRole('link', { name: 'Neues Gericht' }).click();
    await page.getByLabel(/^Name \(Deutsch\)/).fill('Algo');

    await page.getByRole('link', { name: 'Zurück zu den Gerichten' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Ungespeicherte Änderungen');
    await dialog.getByRole('button', { name: 'Weiter bearbeiten' }).click();
    await expect(page).toHaveURL(/\/admin\/menu\/dishes\/new\?categoryId=\d+$/);
    await expect(page.getByLabel(/^Name \(Deutsch\)/)).toHaveValue('Algo');

    await page.getByRole('link', { name: 'Zurück zu den Gerichten' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Ohne Speichern verlassen' })
      .click();
    await expect(page).toHaveURL(new RegExp(`/admin/menu/dishes\\?categoryId=${categoryId}$`));
  });

  test('listado y formulario cumplen WCAG 2.2 AA (de y es)', async ({ page }) => {
    const name = uniqueName('Accesible');
    await signIn(page);
    const categoryId = await createCategory(page, uniqueName('Cat a11y'));
    const id = await createDish(page, categoryId, name, { isProvisional: true });

    await page.goto(`/admin/menu/dishes/${id}`);
    await expect(page.getByLabel(/^Name \(Deutsch\)/)).toHaveValue(name);
    expect(await axeViolations(page)).toEqual([]);

    await openList(page, name);
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.getByRole('heading', { name: 'Platos' })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole('link', { name: 'Nuevo plato' }).click();
    await page.getByLabel('Elegir foto').setInputFiles(PHOTO);
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByLabel(/^Nombre \(alemán\)/)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel(/^Descripción de la foto \(alemán\)/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(await axeViolations(page)).toEqual([]);
  });
});
