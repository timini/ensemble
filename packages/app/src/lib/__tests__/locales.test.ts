/**
 * EN and FR must offer the same keys, so French users never see English
 * fallbacks. Covers the app's `common` namespace and the component library's
 * `translation` namespace.
 */
import { describe, expect, it } from "vitest";
import enApp from "../../../public/locales/en/common.json";
import frApp from "../../../public/locales/fr/common.json";
import enComponents from "@/lib/i18n/locales/en.json";
import frComponents from "@/lib/i18n/locales/fr.json";

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

function missing(from: unknown, to: unknown): string[] {
  const target = new Set(keysOf(to));
  return keysOf(from).filter((key) => !target.has(key));
}

describe("locale files", () => {
  it("app common: every EN key has a FR string", () => {
    expect(missing(enApp, frApp)).toEqual([]);
  });

  it("app common: every FR key has an EN string", () => {
    expect(missing(frApp, enApp)).toEqual([]);
  });

  it("component library: EN and FR have the same keys", () => {
    expect(missing(enComponents, frComponents)).toEqual([]);
    expect(missing(frComponents, enComponents)).toEqual([]);
  });
});
