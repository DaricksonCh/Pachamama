import { DEFAULT_LANGUAGE, isSupportedLanguage } from '@pachamama/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useParams } from 'react-router';
import { LanguageSwitcher } from '@/components/language-switcher';

/** Sincroniza el idioma de la URL (/de, /es) con i18next y el atributo lang del documento. */
export function LanguageLayout() {
  const { lang } = useParams();
  const { t, i18n } = useTranslation();
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
    <div className="min-h-dvh bg-brand-50 text-gray-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-display text-xl font-semibold text-brand-700">{t('app.name')}</span>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Outlet />
      </main>
    </div>
  );
}
