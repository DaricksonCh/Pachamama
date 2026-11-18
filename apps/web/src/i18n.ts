import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@pachamama/shared';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de/common.json';
import es from './locales/es/common.json';

void i18n.use(initReactI18next).init({
  resources: {
    de: { common: de },
    es: { common: es },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React ya escapa el contenido.
});

export default i18n;
