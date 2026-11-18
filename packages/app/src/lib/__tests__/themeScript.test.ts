import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_SCRIPT } from "../themeScript";

// The script is a string run by the browser in <head>; run it the same way.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const script = new Function(THEME_SCRIPT) as () => void;
const run = () => script();
const dark = (on: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: on && q === "(prefers-color-scheme: dark)",
  }));

// An in-memory store: Node 22+ has its own localStorage global, which can
// hide the one jsdom provides.
const stored = new Map<string, string>();
const storage = {
  getItem: (k: string) => stored.get(k) ?? null,
  setItem: (k: string, v: string) => void stored.set(k, v),
};

describe("THEME_SCRIPT", () => {
  beforeEach(() => {
    stored.clear();
    vi.stubGlobal("localStorage", storage);
    document.documentElement.className = "font light";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("follows the system on a first visit", () => {
    dark(true);
    run();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.classList.contains("font")).toBe(true);
  });

  it("uses the stored choice over the system", () => {
    dark(true);
    storage.setItem("ensemble-ai-store", JSON.stringify({ theme: "light" }));
    run();
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("stays light when storage cannot be read", () => {
    dark(false);
    storage.setItem("ensemble-ai-store", "{not json");
    expect(run).not.toThrow();
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
