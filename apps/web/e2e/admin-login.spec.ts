import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { E2E_ADMIN, E2E_STAFF } from './fixtures';

let ipSeq = 0;
/** IP propia por test: el límite de intentos de login es por IP y no debe mezclar tests. */
async function useOwnIp(page: Page) {
  ipSeq += 1;
  const info = test.info();
  const project = info.project.name === 'mobile' ? 1 : 0;
  // Única por worker, proyecto y test (los workers corren en paralelo).
  await page.setExtraHTTPHeaders({
    'X-Forwarded-For': `10.${info.workerIndex % 250}.${project * 100 + info.retry}.${ipSeq}`,
  });
}

async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

test.describe('panel /admin: login y acceso', () => {
  test.beforeEach(async ({ page }) => {
    await useOwnIp(page);
  });

  test('sin sesión, /admin redirige al login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  });

  test('el admin entra, ve su panel y cierra sesión', async ({ page }) => {
    await page.goto('/admin/login');
    await fillLogin(page, E2E_ADMIN.email, E2E_ADMIN.password);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: `Hallo, ${E2E_ADMIN.name}` })).toBeVisible();
    await expect(page.getByText('(Administrator)')).toBeVisible();

    // La cookie de sesión no es accesible desde JavaScript (httpOnly).
    expect(await page.evaluate(() => document.cookie)).not.toContain('session_token');

    await page.getByRole('button', { name: 'Abmelden' }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('el personal entra con su rol', async ({ page }) => {
    await page.goto('/admin/login');
    await fillLogin(page, E2E_STAFF.email, E2E_STAFF.password);
    await expect(page.getByText('(Personal)')).toBeVisible();
  });

  test('credenciales incorrectas muestran un error genérico', async ({ page }) => {
    await page.goto('/admin/login');
    await fillLogin(page, E2E_ADMIN.email, 'contraseña-equivocada');

    await expect(page.getByRole('alert')).toHaveText('E-Mail oder Passwort ist falsch.');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('valida el formulario antes de enviarlo', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('E-Mail').fill('no-es-un-email');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page.getByText('Bitte eine gültige E-Mail-Adresse eingeben.')).toBeVisible();
    await expect(page.getByText('Dieses Feld ist erforderlich.')).toBeVisible();
    await expect(page.getByLabel('E-Mail')).toHaveAttribute('aria-invalid', 'true');
  });

  test('tras 5 intentos fallidos bloquea temporalmente (fuerza bruta)', async ({ page }) => {
    await page.goto('/admin/login');
    for (let i = 0; i < 5; i++) {
      await fillLogin(page, E2E_ADMIN.email, `mala-${i}`);
      await expect(page.getByRole('alert')).toBeVisible();
    }
    await fillLogin(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await expect(page.getByRole('alert')).toHaveText('Zu viele Versuche. Bitte warte eine Minute.');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('un intento de XSS en el email se muestra como texto, no se ejecuta', async ({ page }) => {
    let dialogOpened = false;
    page.on('dialog', async (dialog) => {
      dialogOpened = true;
      await dialog.dismiss();
    });
    await page.goto('/admin/login');
    await fillLogin(page, '"><img src=x onerror=alert(1)>@x.de', 'x');

    await expect(page.getByText('Bitte eine gültige E-Mail-Adresse eingeben.')).toBeVisible();
    expect(dialogOpened).toBe(false);
  });

  test('la página de login cumple WCAG 2.2 AA', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('muestra un skeleton mientras comprueba la sesión', async ({ page }) => {
    await page.route('**/api/v1/me', () => new Promise(() => {}));
    await page.goto('/admin');
    await expect(page.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByTestId('skeleton').first()).toBeVisible();
  });
});
