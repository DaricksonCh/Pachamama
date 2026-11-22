import type { Page } from '@playwright/test';

/** Opens the language dropdown (flag + code) and picks a language by its name. */
export async function switchLanguage(page: Page, language: 'Deutsch' | 'Español') {
  await page
    .getByRole('button', { name: /^(Sprache|Idioma): / })
    .filter({ visible: true })
    .click();
  await page.getByRole('menuitem', { name: language }).click();
}
