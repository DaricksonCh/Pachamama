import { switchLanguage } from './language-helpers';
import { expect, test } from '@playwright/test';
import { axeViolations, signIn, useOwnIp } from './admin-helpers';
import { E2E_ADMIN } from './fixtures';

test.describe('panel /admin: navegación lateral e inicio', () => {
  test.beforeEach(async ({ page }) => {
    await useOwnIp(page, 200);
  });

  test('el admin ve la navegación con "Speisekarte" y llega a Gerichte', async ({
    page,
  }, testInfo) => {
    await signIn(page);

    if (testInfo.project.name === 'mobile') {
      // En móvil el lateral es un menú desplegable que se abre con el botón.
      await page.getByRole('button', { name: 'Menü öffnen' }).click();
    }
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    await expect(nav.getByText('Speisekarte')).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Kategorien' })).toBeVisible();

    await nav.getByRole('link', { name: 'Gerichte' }).click();

    await expect(page).toHaveURL(/\/admin\/menu\/dishes$/);
    await expect(page.getByRole('heading', { name: 'Gerichte' })).toBeVisible();
  });

  test('el enlace PDF abre una pestaña nueva en el idioma actual', async ({ page }, testInfo) => {
    await signIn(page);
    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: 'Menü öffnen' }).click();
    }

    const pdf = page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .getByRole('link', { name: /PDF/ });

    await expect(pdf).toHaveAttribute('href', '/api/v1/menu/pdf?lang=de');
    await expect(pdf).toHaveAttribute('target', '_blank');
  });

  test('el inicio muestra las tarjetas del resumen enlazadas a los listados', async ({ page }) => {
    await signIn(page);

    const summary = page.getByRole('region', { name: 'Übersicht der Speisekarte' });
    await expect(summary).toHaveAttribute('aria-busy', 'false');
    await expect(summary.getByRole('link', { name: /Sichtbare Gerichte/ })).toHaveAttribute(
      'href',
      '/admin/menu/dishes?status=visible',
    );
    await expect(summary.getByRole('link', { name: /Ohne Foto/ })).toHaveAttribute(
      'href',
      '/admin/menu/dishes?withoutImage=true',
    );

    await summary.getByRole('link', { name: /Kategorien/ }).click();
    await expect(page).toHaveURL(/\/admin\/menu\/categories$/);
  });

  test('el inicio cumple WCAG 2.2 AA (de y es)', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('region', { name: 'Übersicht der Speisekarte' })).toHaveAttribute(
      'aria-busy',
      'false',
    );

    const de = await axeViolations(page);
    expect(de).toEqual([]);

    await switchLanguage(page, 'Español');
    await expect(page.getByRole('region', { name: 'Resumen de la carta' })).toHaveAttribute(
      'aria-busy',
      'false',
    );

    const es = await axeViolations(page);
    expect(es).toEqual([]);
  });

  test('el login vuelve a la sección pedida', async ({ page }) => {
    await page.goto('/admin/menu/dishes?status=visible');
    await expect(page).toHaveURL(/[/]admin[/]login[?]next=/);
    await page.getByLabel('E-Mail').fill(E2E_ADMIN.email);
    await page.getByLabel('Passwort').fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page).toHaveURL(/[/]admin[/]menu[/]dishes[?]status=visible$/);
    await expect(page.getByRole('heading', { name: 'Gerichte' })).toBeVisible();
    await expect(page.locator('main')).toHaveCount(1);
  });

  test('con la sesión borrada, entrar en una sección lleva al login', async ({
    page,
    context,
  }, testInfo) => {
    await signIn(page);
    // Esperar al resumen: si su petición aún vuela al borrar la sesión, el 401 redirige antes del clic.
    await expect(page.getByRole('region', { name: 'Übersicht der Speisekarte' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await context.clearCookies();

    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: 'Menü öffnen' }).click();
    }
    await page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .getByRole('link', { name: 'Gerichte' })
      .click();

    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fmenu%2Fdishes$/);
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  });
});
