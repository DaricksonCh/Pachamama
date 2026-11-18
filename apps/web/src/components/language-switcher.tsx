import { SUPPORTED_LANGUAGES } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <nav aria-label={t('language.label')} className="flex gap-3 text-sm">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <Link
          key={lang}
          to={`/${lang}`}
          lang={lang}
          aria-current={i18n.language === lang ? 'true' : undefined}
          className="underline-offset-4 hover:underline aria-[current=true]:font-semibold"
        >
          {t(`language.${lang}`)}
        </Link>
      ))}
    </nav>
  );
}
