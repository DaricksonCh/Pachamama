import { isSupportedLanguage } from '@pachamama/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const STORAGE_KEY = 'pachamama.adminLanguage';

function readStoredLanguage() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isSupportedLanguage(value) ? value : null;
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
}

/**
 * Idioma del panel (no lleva prefijo /de o /es en la URL): se recuerda en este navegador
 * y se refleja en <html lang> para lectores de pantalla.
 */
export function useAdminLanguage() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const stored = readStoredLanguage();
    if (stored && stored !== i18n.language) void i18n.changeLanguage(stored);
  }, [i18n]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
}
