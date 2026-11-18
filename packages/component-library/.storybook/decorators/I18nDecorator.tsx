import React, { useEffect } from 'react';
import type { Decorator } from '@storybook/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../src/lib/i18n/locales/en.json';
import fr from '../../src/lib/i18n/locales/fr.json';

// Initialize i18next for Storybook with the component library's own
// locale files, so stories show the same strings as the app.
i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  debug: false,
  interpolation: {
    escapeValue: false, // React already escapes
  },
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
});

/**
 * I18nDecorator provides internationalization support for Storybook stories
 *
 * Adds a toolbar control to switch between EN and FR languages
 * Wraps stories in I18nextProvider with the selected language
 */
export const I18nDecorator: Decorator = (Story, context) => {
  const { globals } = context;
  const locale = globals.locale || 'en';

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale]);

  return (
    <I18nextProvider i18n={i18n}>
      <Story />
    </I18nextProvider>
  );
};

// Toolbar configuration for language switching
export const localeToolbar = {
  locale: {
    description: 'Internationalization locale',
    defaultValue: 'en',
    toolbar: {
      title: 'Locale',
      icon: 'globe',
      items: [
        { value: 'en', right: '🇺🇸', title: 'English' },
        { value: 'fr', right: '🇫🇷', title: 'Français' },
      ],
      dynamicTitle: true,
    },
  },
};
