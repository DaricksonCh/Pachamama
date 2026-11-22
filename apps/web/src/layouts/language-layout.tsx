import { DEFAULT_LANGUAGE, isSupportedLanguage } from '@pachamama/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useParams } from 'react-router';
import { SiteFooter } from '@/components/public/site-footer';
import { SiteHeader } from '@/components/public/site-header';

/** Public layout: syncs the URL language (/de, /es) with i18next and <html lang>, adds header and footer. */
export function LanguageLayout() {
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const valid = isSupportedLanguage(lang);

  useEffect(() => {
    if (valid && i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
    if (valid) {
      document.documentElement.lang = lang;
    }
  }, [lang, valid, i18n]);

  if (!valid) {
    return <Navigate to={`/${DEFAULT_LANGUAGE}`} replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-papel text-tierra">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
