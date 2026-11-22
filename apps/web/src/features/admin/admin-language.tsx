import { SUPPORTED_LANGUAGES } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEY } from './use-admin-language';

export function AdminLanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const select = (lang: string) => {
    void i18n.changeLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // sin almacenamiento: el cambio vale solo para esta visita
    }
  };

  return (
    <nav aria-label={t('language.label')} className="flex gap-2 text-sm">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          aria-pressed={i18n.language === lang}
          onClick={() => select(lang)}
          className="rounded px-1.5 py-0.5 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring aria-pressed:font-semibold"
        >
          {t(`language.${lang}`)}
        </button>
      ))}
    </nav>
  );
}
