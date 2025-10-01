import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files from public/locales
import enTranslations from '../../public/locales/en/common.json';
import frTranslations from '../../public/locales/fr/common.json';

/**
 * i18next configuration for Ensemble AI
 *
 * Supports EN and FR languages from day one
 * Resources are loaded from public/locales directory
 * Uses 'common' namespace for consistency with file structure
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enTranslations,
      },
      fr: {
        common: frTranslations,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  })
  .catch((error) => {
    console.error('i18n initialization failed:', error);
  });

export default i18n;
