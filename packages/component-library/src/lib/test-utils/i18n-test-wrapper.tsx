import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';

/**
 * Creates a new i18n instance for testing to avoid state pollution between tests
 * @param language - The language to use for the test ('en' or 'fr')
 * @returns A configured i18n instance
 */
export const createTestI18n = (language: 'en' | 'fr' = 'en'): I18nInstance => {
  const testI18n = i18n.createInstance();

  testI18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

  return testI18n;
};

interface RenderWithI18nOptions extends Omit<RenderOptions, 'wrapper'> {
  language?: 'en' | 'fr';
}

/**
 * Renders a component with i18n support for testing
 * @param ui - The component to render
 * @param options - Render options including language selection
 * @returns The render result with i18n context
 */
export const renderWithI18n = (
  ui: ReactElement,
  { language = 'en', ...renderOptions }: RenderWithI18nOptions = {}
) => {
  const testI18n = createTestI18n(language);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
