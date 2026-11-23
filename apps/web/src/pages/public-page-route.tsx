import { isSupportedLanguage, pageFromSlug, type PublicPage } from '@pachamama/shared';
import type { ComponentType } from 'react';
import { Navigate, useParams } from 'react-router';
import { ContactPage } from './contact-page';
import { ImprintPage } from './imprint-page';
import { MenuPage } from './menu-page';
import { PrivacyPage } from './privacy-page';
import { ReservationsPage } from './reservations-page';
import { StoryPage } from './story-page';

/** Pages routed today. The header button reaches `reservations` because RESERVATIONS_MODE is 'form'. */
const PAGES: Partial<Record<PublicPage, ComponentType>> = {
  menu: MenuPage,
  story: StoryPage,
  contact: ContactPage,
  imprint: ImprintPage,
  privacy: PrivacyPage,
  reservations: ReservationsPage,
};

/**
 * Resolves `/:lang/:slug` with the localized slugs of `PUBLIC_PAGES` (e.g. `/de/speisekarte`,
 * `/es/carta`). A slug from the other language or an unknown one goes to the home page.
 */
export function PublicPageRoute() {
  const { lang, slug = '' } = useParams();
  const page = isSupportedLanguage(lang) ? pageFromSlug(slug, lang) : undefined;
  const Page = page ? PAGES[page] : undefined;

  if (!Page) return <Navigate to={`/${lang ?? ''}`} replace />;
  return <Page key={page} />;
}
