import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationIT from './locales/it.json';
import translationEN from './locales/en.json';

const resources = {
  it: { translation: translationIT },
  en: { translation: translationEN },
};

// Get language from localStorage or use browser default
const getInitialLanguage = (): string => {
  try {
    const saved = localStorage.getItem('app_language');
    if (saved && ['it', 'en'].includes(saved)) {
      return saved;
    }
    
    // Fallback to browser language
    const browserLang = navigator.language.split('-')[0];
    return ['it', 'en'].includes(browserLang) ? browserLang : 'it';
  } catch (error) {
    return 'it';
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // Disable suspense to avoid loading issues
    },
  });

export default i18n;

