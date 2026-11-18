/**
 * Every literal key passed to `t()` in the app and the component library
 * must exist in the EN files (and so, through locales.test.ts, in FR).
 * A missing key renders the raw key to the user. Keys built at run time
 * (template strings) are not checked here.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import enApp from "../../../public/locales/en/common.json";
import enComponents from "@/lib/i18n/locales/en.json";

const ROOTS = [
  resolve(__dirname, "../../../src"),
  resolve(__dirname, "../../../../component-library/src"),
];
const SKIP = [/\.stories\.tsx?$/, /\.test\.tsx?$/, /__tests__/, /test-utils/];
const PLURALS = ["", "_zero", "_one", "_other"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(path) && !SKIP.some((re) => re.test(path))
      ? [path]
      : [];
  });
}

function has(tree: unknown, key: string): boolean {
  return PLURALS.some((suffix) => {
    let node: unknown = tree;
    for (const part of `${key}${suffix}`.split(".")) {
      if (typeof node !== "object" || node === null) return false;
      node = (node as Record<string, unknown>)[part];
    }
    return node !== undefined;
  });
}

describe("translation keys used in code", () => {
  it("all exist in the EN files", () => {
    const missing: string[] = [];
    for (const path of ROOTS.flatMap(files)) {
      const text = readFileSync(path, "utf8");
      for (const match of text.matchAll(
        /\bt\(\s*(["'`])([A-Za-z][\w-]*(?:\.[\w-]+)+)\1/g,
      )) {
        const key = match[2]!;
        if (!has(enApp, key) && !has(enComponents, key)) {
          missing.push(
            `${relative(resolve(__dirname, "../../../.."), path)}: ${key}`,
          );
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
