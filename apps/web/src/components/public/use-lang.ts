import { DEFAULT_LANGUAGE, isSupportedLanguage, type Language } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';

/** Normalizes an i18next language tag ("de-DE" -> "de"); unknown values fall back to the default. */
export function normalizeLanguage(value: string | undefined): Language {
  if (isSupportedLanguage(value)) return value;
  const base = value?.split('-')[0];
  return isSupportedLanguage(base) ? base : DEFAULT_LANGUAGE;
}

/** Current UI language, always one of the supported ones. */
export function useLang(): Language {
  const { i18n } = useTranslation();
  return normalizeLanguage(i18n.language);
}
