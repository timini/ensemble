/**
 * Helpers that read colour tokens out of tokens.css and compute WCAG
 * contrast ratios. Used by the token tests to keep every text and UI
 * pairing at AA in both themes.
 */

/** Space separated RGB channels, as stored in tokens.css. */
export type Rgb = [number, number, number];

/** Colour tokens per theme, keyed without the `--color-` prefix. */
export type ThemeColours = Record<'light' | 'dark', Record<string, Rgb>>;

const BLOCKS: Array<[keyof ThemeColours, RegExp]> = [
  ['light', /:root\s*\{([^}]*)\}/],
  ['dark', /\.dark\s*\{([^}]*)\}/],
];

/**
 * Parses the `:root` (light) and `.dark` blocks of a token stylesheet.
 * Only `--color-*` declarations with three numeric channels are returned.
 */
export function parseThemeBlocks(css: string): ThemeColours {
  const result = { light: {}, dark: {} } as ThemeColours;
  for (const [theme, pattern] of BLOCKS) {
    const body = pattern.exec(css)?.[1] ?? '';
    for (const match of body.matchAll(/--color-([a-z-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
      result[theme][match[1]!] = [Number(match[2]), Number(match[3]), Number(match[4])];
    }
  }
  return result;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.1 relative luminance. */
export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
