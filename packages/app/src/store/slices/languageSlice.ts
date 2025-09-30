import { StateCreator } from 'zustand';

export type Language = 'en' | 'fr';

export interface LanguageSlice {
  language: Language;
  setLanguage: (language: Language) => void;
}

/**
 * Language slice for managing internationalization
 *
 * Persists language preference to localStorage
 * Integrates with react-i18next for translations
 */
export const createLanguageSlice: StateCreator<LanguageSlice> = (set) => ({
  language: 'en',
  setLanguage: (language) => set({ language }),
});
