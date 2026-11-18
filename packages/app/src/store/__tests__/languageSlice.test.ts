import { afterEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import {
  createLanguageSlice,
  type LanguageSlice,
} from "../slices/languageSlice";

const create = () => createStore<LanguageSlice>()(createLanguageSlice);

describe("languageSlice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts in English for an English or unknown browser language", () => {
    vi.stubGlobal("navigator", { language: "de-DE", languages: ["de-DE"] });
    expect(create().getState().language).toBe("en");
  });

  it("starts in French when the browser prefers French", () => {
    vi.stubGlobal("navigator", {
      language: "fr-CA",
      languages: ["fr-CA", "en"],
    });
    expect(create().getState().language).toBe("fr");
  });

  it("follows the first supported language in the browser list", () => {
    vi.stubGlobal("navigator", {
      language: "de-DE",
      languages: ["de-DE", "fr", "en"],
    });
    expect(create().getState().language).toBe("fr");
  });

  it("changes language", () => {
    const store = create();
    store.getState().setLanguage("fr");
    expect(store.getState().language).toBe("fr");
  });
});
