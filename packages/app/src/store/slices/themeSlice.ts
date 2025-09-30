import type { StateCreator } from 'zustand';

export type Theme = 'light' | 'dark';

export interface ThemeSlice {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Theme slice for managing light/dark mode
 *
 * Persists theme preference to localStorage
 * Applies theme class to document root for global CSS variables
 */
export const createThemeSlice: StateCreator<ThemeSlice> = (set) => ({
  theme: 'light',
  setTheme: (theme) => {
    set({ theme });
    // Apply theme to document root
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  },
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      // Apply theme to document root
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newTheme);
      }
      return { theme: newTheme };
    }),
});
