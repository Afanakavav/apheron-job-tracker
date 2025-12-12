import { useCallback } from 'react';
import i18n from '../i18n/i18n';

/**
 * Custom hook for translations
 * Avoids React context issues with lazy-loaded components
 */
export const useTranslation = () => {
  const t = useCallback((key: string, options?: any): string => {
    try {
      const result = i18n.t(key, options);
      return typeof result === 'string' ? result : key;
    } catch (error) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }, []);

  const language = i18n.language || 'it';

  const changeLanguage = useCallback(async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }, []);

  return {
    t,
    i18n,
    language,
    changeLanguage,
  };
};

