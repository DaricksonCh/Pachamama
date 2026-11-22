import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import { PUBLIC_PAGES, pageFromSlug, publicPath, type PublicPage } from './public-routes';

const pages = Object.keys(PUBLIC_PAGES) as PublicPage[];

describe('public routes', () => {
  it('builds localized paths', () => {
    expect(publicPath('home', 'de')).toBe('/de');
    expect(publicPath('menu', 'de')).toBe('/de/speisekarte');
    expect(publicPath('menu', 'es')).toBe('/es/carta');
    expect(publicPath('imprint', 'es')).toBe('/es/aviso-legal');
  });

  it.each(SUPPORTED_LANGUAGES)('has unique, URL-safe slugs in %s', (lang) => {
    const slugs = pages.map((page) => PUBLIC_PAGES[page][lang]);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z-]*$/);
  });

  it.each(SUPPORTED_LANGUAGES)('round-trips every page slug in %s', (lang) => {
    for (const page of pages) expect(pageFromSlug(PUBLIC_PAGES[page][lang], lang)).toBe(page);
  });

  it('returns undefined for unknown slugs', () => {
    expect(pageFromSlug('speisekarte', 'es')).toBeUndefined();
  });
});
