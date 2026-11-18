/**
 * Runs in <head> before the first paint: puts the stored theme, or the
 * system's colour scheme on a first visit, on <html>, so a dark page does
 * not flash light while the app loads. Kept in step with
 * `preferredTheme` in store/slices/themeSlice.ts and the store key.
 */
export const THEME_SCRIPT = `try {
  var stored = JSON.parse(localStorage.getItem("ensemble-ai-store") || "{}").theme;
  var theme = stored === "dark" || stored === "light" ? stored
    : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
} catch (e) {}`;
