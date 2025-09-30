import { create } from 'zustand';
import { persist } from './middleware/persistenceMiddleware';
import {
  createThemeSlice,
  type ThemeSlice,
} from './slices/themeSlice';
import {
  createLanguageSlice,
  type LanguageSlice,
} from './slices/languageSlice';

/**
 * Root Zustand store combining all slices
 *
 * Uses persistence middleware to sync essential state to localStorage
 * Only theme and language are persisted in Phase 1
 * Additional slices will be added in Phase 2+
 */

export type StoreState = ThemeSlice & LanguageSlice;

export const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createThemeSlice(...a),
      ...createLanguageSlice(...a),
    }),
    {
      name: 'ensemble-ai-store',
    },
  ),
);

// Export individual slice types for convenience
export type { Theme } from './slices/themeSlice';
export type { Language } from './slices/languageSlice';
