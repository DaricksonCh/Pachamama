import { isSupportedLanguage, type Language } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { LanguageMenu } from '@/components/language-menu';
import { STORAGE_KEY } from './use-admin-language';

export function AdminLanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = isSupportedLanguage(i18n.language) ? i18n.language : 'de';

  const select = (lang: Language) => {
    void i18n.changeLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // sin almacenamiento: el cambio vale solo para esta visita
    }
  };

  return (
    <LanguageMenu current={current} targetFor={(lang) => ({ onSelect: () => select(lang) })} />
  );
}
