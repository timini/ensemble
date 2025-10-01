import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files from app's public/locales
import enAppTranslations from '../../public/locales/en/common.json';
import frAppTranslations from '../../public/locales/fr/common.json';

// Import translation files from component library
import enComponentTranslations from '@/lib/i18n/locales/en.json';
import frComponentTranslations from '@/lib/i18n/locales/fr.json';

/**
 * i18next configuration for Ensemble AI
 *
 * Supports EN and FR languages from day one
 * Merges app translations (common namespace) with component library translations (translation namespace)
 * Component library uses 'translation' as default namespace
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enAppTranslations,
        translation: enComponentTranslations,
      },
      fr: {
        common: frAppTranslations,
        translation: frComponentTranslations,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'translation', // Component library uses 'translation' namespace
    ns: ['translation', 'common'],
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
