import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { E2E_ADMIN } from './fixtures';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// Reglas de landmarks (un único <main> de primer nivel, contenido dentro de landmarks).
const LANDMARK_RULES = ['landmark-no-duplicate-main', 'landmark-main-is-top-level', 'region'];

/** WCAG 2.2 AA + reglas de landmarks (dos pasadas: withRules sustituye a withTags). */
async function axeViolations(page: Page) {
  const wcag = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const landmarks = await new AxeBuilder({ page }).withRules(LANDMARK_RULES).analyze();
  return [...wcag.violations, ...landmarks.violations].map((v) => `${v.id}: ${v.help}`);
}

let ipSeq = 0;
/** IP propia por test: el límite de intentos de login es por IP (ver admin-login.spec.ts). */
async function useOwnIp(page: Page) {
  ipSeq += 1;
  const info = test.info();
  const project = info.project.name === 'mobile' ? 1 : 0;
  // Rango distinto del de admin-login.spec.ts para no compartir contador entre archivos.
  await page.setExtraHTTPHeaders({
    'X-Forwarded-For': `10.${(info.workerIndex % 250) + 1}.${project * 100 + info.retry}.${200 + (ipSeq % 50)}`,
  });
}

async function signIn(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('E-Mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Passwort').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe('panel /admin: navegación lateral e inicio', () => {
  test.beforeEach(async ({ page }) => {
    await useOwnIp(page);
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

    await page.getByRole('button', { name: 'Español' }).click();
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
