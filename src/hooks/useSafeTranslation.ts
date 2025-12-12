import { useTranslation } from 'react-i18next';

/**
 * Safe wrapper for useTranslation hook
 * Returns useTranslation or provides fallback
 */
export const useSafeTranslation = () => {
  const result = useTranslation();
  
  // Validate result
  if (!result || !result.t) {
    console.warn('i18n not properly initialized, using fallback');
    return {
      t: (key: string) => key,
      i18n: {
        language: 'it',
        changeLanguage: () => Promise.resolve(),
      },
    };
  }
  
  return result;
};

