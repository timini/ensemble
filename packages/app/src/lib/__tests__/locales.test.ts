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

function entries(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    entries(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(text: string): string {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");
}

describe.each([
  ["app common", enApp, frApp],
  ["component library", enComponents, frComponents],
])("%s strings", (_name, en, fr) => {
  it("has no empty strings", () => {
    const empty = [...entries(en), ...entries(fr)]
      .filter(([, text]) => text.trim() === "")
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  // House style: no em or en dashes in user-facing copy.
  it("has no em or en dashes", () => {
    const dashed = [...entries(en), ...entries(fr)]
      .filter(([, text]) => /[\u2013\u2014]/.test(text))
      .map(([key]) => key);
    expect(dashed).toEqual([]);
  });

  it("uses the same {{placeholders}} in EN and FR", () => {
    const frByKey = new Map(entries(fr));
    const mismatched = entries(en)
      .filter(([key, text]) => {
        const other = frByKey.get(key);
        return (
          other !== undefined && placeholders(other) !== placeholders(text)
        );
      })
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });
});
