import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from '../../public/locales/en/common.json';
import frCommon from '../../public/locales/fr/common.json';

/**
 * i18next configuration for Ensemble AI
 *
 * Supports EN and FR languages from day one
 * Resources are loaded synchronously for simplicity in Phase 1
 * Future phases may add async loading for additional translation namespaces
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
      },
      fr: {
        common: frCommon,
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
