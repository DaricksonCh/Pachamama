import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { E2E_ADMIN } from './fixtures';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// Reglas de landmarks (un único <main> de primer nivel, contenido dentro de landmarks).
const LANDMARK_RULES = ['landmark-no-duplicate-main', 'landmark-main-is-top-level', 'region'];

/** WCAG 2.2 AA + reglas de landmarks (dos pasadas: withRules sustituye a withTags). */
export async function axeViolations(page: Page) {
  const wcag = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const landmarks = await new AxeBuilder({ page }).withRules(LANDMARK_RULES).analyze();
  return [...wcag.violations, ...landmarks.violations].map((v) => `${v.id}: ${v.help}`);
}

let ipSeq = 0;
/**
 * IP propia por test: el límite de intentos de login es por IP (ver admin-login.spec.ts).
 * `lastOctetBase` separa los rangos de cada archivo de tests para no compartir contador.
 */
export async function useOwnIp(page: Page, lastOctetBase: number) {
  ipSeq += 1;
  const info = test.info();
  const project = info.project.name === 'mobile' ? 1 : 0;
  await page.setExtraHTTPHeaders({
    'X-Forwarded-For': `10.${(info.workerIndex % 250) + 1}.${project * 100 + info.retry}.${lastOctetBase + (ipSeq % 50)}`,
  });
}

export async function signIn(
  page: Page,
  credentials: { email: string; password: string } = E2E_ADMIN,
) {
  await page.goto('/admin/login');
  await page.getByLabel('E-Mail').fill(credentials.email);
  await page.getByLabel('Passwort').fill(credentials.password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Nombre único por test y proyecto: escritorio y móvil comparten la BD de pruebas. */
export function uniqueName(label: string) {
  const info = test.info();
  return `${label} ${info.project.name} ${Date.now() % 1_000_000}${info.retry}`;
}

/** Llama a la API con la sesión del navegador (el navegador añade el Origin que exige el CSRF). */
export async function api(page: Page, method: string, path: string, body: unknown) {
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

export async function createCategory(page: Page, name: string) {
  const { data } = await api(page, 'POST', '/api/v1/admin/menu/categories', {
    nameDe: name,
    nameEs: name,
    status: 'visible',
  });
  return data.id;
}

export async function createDish(
  page: Page,
  categoryId: number,
  name: string,
  extra: Record<string, unknown> = {},
) {
  const { data } = await api(page, 'POST', '/api/v1/admin/menu/dishes', {
    categoryId,
    nameDe: name,
    nameEs: name,
    price: 9.5,
    diet: null,
    allergens: [],
    status: 'visible',
    isProvisional: false,
    ...extra,
  });
  return data.id;
}

/** Fila de una tabla que contiene `name`. */
export const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });
