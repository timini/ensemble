import type { StateCreator } from 'zustand';

export type Language = 'en' | 'fr';

export interface LanguageSlice {
  language: Language;
  setLanguage: (language: Language) => void;
}

const SUPPORTED: readonly Language[] = ['en', 'fr'];

/**
 * The first supported language in the browser's list, for a first visit.
 * English on the server and when none is supported.
 */
export function preferredLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const list = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of list) {
    const base = tag?.toLowerCase().split('-')[0] as Language;
    if (SUPPORTED.includes(base)) return base;
  }
  return 'en';
}

/**
 * Language slice for managing internationalization
 *
 * Starts from the browser's language; a stored choice replaces it when the
 * store loads. Persists language preference to localStorage.
 * Integrates with react-i18next for translations
 */
export const createLanguageSlice: StateCreator<LanguageSlice> = (set) => ({
  language: preferredLanguage(),
  setLanguage: (language) => set({ language }),
});
