/**
 * No hard-coded UI text: every word a user reads goes through react-i18next
 * so French users never see English. Parses the app's and the component
 * library's .tsx files and fails on JSX text and on user-facing attributes
 * (aria-label, placeholder, title, alt, and the component library's text
 * props such as label, description and heading) written as plain string
 * literals. It also reads the app's .ts files under src/app and src/lib and
 * fails on a string literal passed to a function that shows text to the
 * user (setError, toast). Stories, tests, the dev-only /test-components page
 * and Storybook helpers are left out. Brand and product names, symbols and
 * numbers are allowed.
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

const ATTRIBUTES = new Set([
  "aria-label",
  "placeholder",
  "title",
  "alt",
  // Text props of the component library's components.
  "label",
  "description",
  "heading",
  "lead",
  "eyebrow",
  "emptyText",
]);

/** .ts files whose calls are checked for UI text: the app's pages, hooks and helpers. */
const TS_ROOTS = [
  resolve(__dirname, "../../../src/app"),
  resolve(__dirname, "../../../src/lib"),
];

/** Functions whose string argument is shown to the user. */
const UI_SETTERS =
  /^(setError|setErrorMessage|setMessage|setNotice|toast(\.\w+)?)$/;

/** Server and logging code: their strings are never shown in the UI. */
const TS_SKIP = [
  /\.test\.ts$/,
  /__tests__/,
  /logger/,
  /[\\/]server[\\/]/,
  /[\\/]api[\\/]/,
];

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

function files(dir: string, ext = ".tsx", skip = SKIP): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, ext, skip);
    return path.endsWith(ext) && !skip.some((re) => re.test(path))
      ? [path]
      : [];
  });
}

function isStringLike(
  node: ts.Node | undefined,
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return (
    !!node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  );
}

/** The text of `attr="..."` or `attr={"..."}`, or null for anything else. */
function attributeText(initializer: ts.JsxAttributeValue | undefined) {
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (ts.isJsxExpression(initializer) && isStringLike(initializer.expression)) {
    return initializer.expression.text;
  }
  return null;
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
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
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
      isStringLike(node.expression) &&
      needsTranslation(node.expression.text)
    ) {
      found.push(`${where(node)} text {"${node.expression.text}"}`);
    }
    if (ts.isJsxAttribute(node) && ATTRIBUTES.has(node.name.getText(source))) {
      const text = attributeText(node.initializer);
      if (text !== null && needsTranslation(text)) {
        found.push(`${where(node)} ${node.name.getText(source)}="${text}"`);
      }
    }
    if (
      ts.isCallExpression(node) &&
      UI_SETTERS.test(node.expression.getText(source)) &&
      isStringLike(node.arguments[0]) &&
      needsTranslation(node.arguments[0].text)
    ) {
      found.push(
        `${where(node)} ${node.expression.getText(source)}("${node.arguments[0].text}")`,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("UI text", () => {
  it("has no hard-coded strings in JSX", () => {
    const all = ROOTS.flatMap((root) => files(root)).flatMap(findings);
    expect(all).toEqual([]);
  });

  it("passes no hard-coded strings to UI setters in .ts files", () => {
    const all = TS_ROOTS.flatMap((root) => files(root, ".ts", TS_SKIP)).flatMap(
      findings,
    );
    expect(all).toEqual([]);
  });

  it("would catch a hard-coded label, a braced attribute and a setter call", () => {
    const sample = join(__dirname, "fixtures", "hardcodedSample.tsx");
    expect(findings(sample)).toEqual([
      expect.stringContaining('setError("Something went wrong")'),
      expect.stringContaining('label="Save the preset"'),
      expect.stringContaining('heading="Your history"'),
      expect.stringContaining('aria-label="Close the sheet"'),
    ]);
  });
});
