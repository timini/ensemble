import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files from component library
import enTranslations from '@/lib/i18n/locales/en.json';
import frTranslations from '@/lib/i18n/locales/fr.json';

/**
 * i18next configuration for Ensemble AI
 *
 * Supports EN and FR languages from day one
 * Resources are loaded from the component library
 * Uses 'translation' namespace (i18next default) instead of 'common'
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      fr: {
        translation: frTranslations,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
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
