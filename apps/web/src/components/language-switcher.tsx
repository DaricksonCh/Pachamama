import {
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  pageFromSlug,
  publicPath,
} from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/utils';

/** Links to the same page in the other languages (falls back to the home page). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { pathname, hash } = useLocation();
  const [, currentLang = '', slug = ''] = pathname.split('/');
  const page = isSupportedLanguage(currentLang) ? pageFromSlug(slug, currentLang) : undefined;

  return (
    <nav aria-label={t('language.label')} className={cn('flex gap-3 text-sm', className)}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <Link
          key={lang}
          to={`${publicPath(page ?? 'home', lang)}${page ? hash : ''}`}
          lang={lang}
          aria-current={i18n.language === lang ? 'true' : undefined}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=true]:font-semibold"
        >
          {t(`language.${lang}`)}
        </Link>
      ))}
    </nav>
  );
}
