import { isSupportedLanguage, pageFromSlug, publicPath } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { LanguageMenu } from './language-menu';

/** Language dropdown that links to the same page in the other language (falls back to home). */
export function LanguageSwitcher({
  className,
  align,
}: {
  className?: string;
  align?: 'start' | 'end';
}) {
  const { i18n } = useTranslation();
  const { pathname, hash } = useLocation();
  const [, currentLang = '', slug = ''] = pathname.split('/');
  const page = isSupportedLanguage(currentLang) ? pageFromSlug(slug, currentLang) : undefined;
  const current = isSupportedLanguage(i18n.language) ? i18n.language : 'de';

  return (
    <LanguageMenu
      current={current}
      className={className}
      align={align}
      targetFor={(lang) => ({ href: `${publicPath(page ?? 'home', lang)}${page ? hash : ''}` })}
    />
  );
}
