import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import { createThemeSlice, type ThemeSlice } from "../slices/themeSlice";

describe("themeSlice", () => {
  let store: StoreApi<ThemeSlice>;

  beforeEach(() => {
    store = createStore<ThemeSlice>()(createThemeSlice);
    document.documentElement.className = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initializes with light theme", () => {
    expect(store.getState().theme).toBe("light");
  });

  it("starts dark when the system asks for dark", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
    }));
    const dark = createStore<ThemeSlice>()(createThemeSlice);
    expect(dark.getState().theme).toBe("dark");
  });

  it("sets the provided theme and updates the DOM classes", () => {
    store.getState().setTheme("dark");

    expect(store.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("toggles between light and dark themes", () => {
    store.getState().toggleTheme();
    expect(store.getState().theme).toBe("dark");

    store.getState().toggleTheme();
    expect(store.getState().theme).toBe("light");
  });
});
