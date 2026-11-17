/**
 * No hard-coded UI text: every word a user reads goes through react-i18next
 * so French users never see English. Parses the app's and the component
 * library's .tsx files and fails on JSX text and on user-facing attributes
 * (aria-label, placeholder, title, alt) written as plain string literals.
 * Stories, tests, the dev-only /test-components page and Storybook helpers
 * are left out. Brand and product names, symbols and numbers are allowed.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOTS = [
  resolve(__dirname, "../../../src"),
  resolve(__dirname, "../../../../component-library/src"),
];

const SKIP = [
  /\.stories\.tsx$/,
  /\.test\.tsx$/,
  /__tests__/,
  /test-components/,
  /test-utils/,
  /\.storybook/,
];

const ATTRIBUTES = new Set(["aria-label", "placeholder", "title", "alt"]);

/** Text that needs no translation: names, symbols, numbers, code. */
const ALLOWED = new Set([
  "Ensemble",
  "Ensemble AI",
  "OpenAI",
  "Anthropic",
  "Google",
  "xAI",
  "DeepSeek",
  "Perplexity",
  "Ollama",
  "OpenRouter",
  "LM Studio",
  "GitHub",
  "EN",
  "FR",
  "API",
]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return path.endsWith(".tsx") && !SKIP.some((re) => re.test(path))
      ? [path]
      : [];
  });
}

function needsTranslation(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(trimmed)) return false;
  if (/^[a-z]+:\/\//.test(trimmed)) return false; // URLs, such as an endpoint placeholder
  return !ALLOWED.has(trimmed);
}

function findings(path: string): string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: string[] = [];
  const where = (node: ts.Node) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    return `${relative(resolve(__dirname, "../../../.."), path)}:${line + 1}`;
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && needsTranslation(node.text)) {
      found.push(`${where(node)} text "${node.text.trim()}"`);
    }
    if (
      ts.isJsxExpression(node) &&
      ts.isJsxElement(node.parent) &&
      node.expression &&
      (ts.isStringLiteral(node.expression) ||
        ts.isNoSubstitutionTemplateLiteral(node.expression)) &&
      needsTranslation(node.expression.text)
    ) {
      found.push(`${where(node)} text {"${node.expression.text}"}`);
    }
    if (
      ts.isJsxAttribute(node) &&
      ATTRIBUTES.has(node.name.getText(source)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      needsTranslation(node.initializer.text)
    ) {
      found.push(
        `${where(node)} ${node.name.getText(source)}="${node.initializer.text}"`,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("UI text", () => {
  it("has no hard-coded strings in JSX", () => {
    const all = ROOTS.flatMap(files).flatMap(findings);
    expect(all).toEqual([]);
  });
});
