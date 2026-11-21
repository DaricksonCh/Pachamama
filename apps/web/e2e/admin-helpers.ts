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
