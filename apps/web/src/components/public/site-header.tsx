import { publicPath, type PublicPage } from '@pachamama/shared';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation } from 'react-router';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ReserveButton } from './reserve-button';
import { WovenStripe } from './woven-stripe';
import { useLang } from './use-lang';

const NAV_PAGES = ['menu', 'story', 'contact'] as const satisfies readonly PublicPage[];

const navLinkClass =
  'rounded-sm px-1 py-2 underline-offset-[6px] decoration-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=page]:underline aria-[current=page]:decoration-maiz';

export function SiteHeader() {
  const { t } = useTranslation();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile menu after any navigation (page links, language switch, logo).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className="bg-papel text-tierra">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-selva focus:px-4 focus:py-2 focus:text-papel"
      >
        {t('nav.skip')}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link
          to={publicPath('home', lang)}
          className="flex shrink-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <img src="/images/logo-mark.png" alt="" width={44} height={44} className="size-11" />
          <span className="font-display text-2xl leading-none font-semibold tracking-tight text-selva">
            Pachamama
          </span>
          <span className="sr-only">{t('nav.home')}</span>
        </Link>

        <nav aria-label={t('nav.label')} className="hidden md:block">
          <ul className="flex items-center gap-6 text-[0.95rem] font-medium">
            {NAV_PAGES.map((page) => (
              <li key={page}>
                <NavLink to={publicPath(page, lang)} className={navLinkClass}>
                  {t(`nav.${page}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <LanguageSwitcher />
          <ReserveButton tone="onLight" className="min-h-10 px-4 py-2 text-sm" />
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="inline-flex size-11 items-center justify-center rounded-md text-selva focus-visible:outline-2 md:hidden"
            aria-label={t('nav.open')}
          >
            <Menu aria-hidden="true" className="size-6" />
          </SheetTrigger>
          <SheetContent side="right" className="bg-selva text-papel">
            <SheetTitle className="px-6 pt-6 font-display text-2xl text-papel">
              Pachamama
            </SheetTitle>
            <SheetDescription className="sr-only">{t('nav.label')}</SheetDescription>
            <nav aria-label={t('nav.label')} className="px-6">
              <ul className="flex flex-col gap-1 text-lg">
                {NAV_PAGES.map((page) => (
                  <li key={page}>
                    <NavLink
                      to={publicPath(page, lang)}
                      onClick={() => setOpen(false)}
                      className={`${navLinkClass} block py-3 focus-visible:outline-maiz`}
                    >
                      {t(`nav.${page}`)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto flex flex-col gap-6 px-6 pb-8">
              <ReserveButton tone="onDark" />
              <LanguageSwitcher className="text-base [&_a]:focus-visible:outline-maiz" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <WovenStripe />
    </header>
  );
}
