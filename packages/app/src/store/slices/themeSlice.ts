import type { StateCreator } from "zustand";

export type Theme = "light" | "dark";

export interface ThemeSlice {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * The system's colour scheme, for a first visit. Light on the server and
 * where the browser cannot tell.
 */
export function preferredTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return "light";
  return window.matchMedia("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

/**
 * Theme slice for managing light/dark mode
 *
 * Starts from the system colour scheme; a stored choice replaces it when the
 * store loads. Persists theme preference to localStorage.
 * Applies theme class to document root for global CSS variables
 */
export const createThemeSlice: StateCreator<ThemeSlice> = (set) => ({
  theme: preferredTheme(),
  setTheme: (theme) => {
    set({ theme });
    // Apply theme to document root
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
    }
  },
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === "light" ? "dark" : "light";
      // Apply theme to document root
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(newTheme);
      }
      return { theme: newTheme };
    }),
});
