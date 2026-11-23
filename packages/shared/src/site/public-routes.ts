import type { Language } from '../i18n/languages';

/**
 * Localized slugs of the public pages. The language switcher uses this map to keep the visitor
 * on the equivalent page; `home` is the bare language prefix (`/de`, `/es`).
 */
export const PUBLIC_PAGES = {
  home: { de: '', es: '' },
  menu: { de: 'speisekarte', es: 'carta' },
  story: { de: 'geschichte', es: 'historia' },
  contact: { de: 'kontakt', es: 'contacto' },
  imprint: { de: 'impressum', es: 'aviso-legal' },
  privacy: { de: 'datenschutz', es: 'privacidad' },
  /** Reservations wizard (phase 7). The header button links here while RESERVATIONS_MODE is 'form'. */
  reservations: { de: 'reservieren', es: 'reservar' },
} as const satisfies Record<string, Record<Language, string>>;

export type PublicPage = keyof typeof PUBLIC_PAGES;

/** Absolute path of a public page in a language, e.g. `publicPath('menu', 'es')` → `/es/carta`. */
export function publicPath(page: PublicPage, lang: Language): string {
  const slug = PUBLIC_PAGES[page][lang];
  return slug ? `/${lang}/${slug}` : `/${lang}`;
}

/** Finds which public page a slug belongs to in a language (`undefined` if unknown). */
export function pageFromSlug(slug: string, lang: Language): PublicPage | undefined {
  return (Object.keys(PUBLIC_PAGES) as PublicPage[]).find(
    (page) => PUBLIC_PAGES[page][lang] === slug,
  );
}

/**
 * How the "Reserve" button works. 'form' (phase 7) sends every button to
 * `publicPath('reservations', lang)`; 'phone' is the fallback that calls the restaurant.
 */
export type ReservationsMode = 'phone' | 'form';
export const RESERVATIONS_MODE: ReservationsMode = 'form';
