import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseThemeBlocks } from './tokenContrast';

const css = readFileSync(path.resolve(__dirname, 'tokens.css'), 'utf8');
const themes = parseThemeBlocks(css);

/**
 * Text pairs that must reach WCAG AA for normal text (4.5:1).
 * Format: [foreground token, background token].
 */
const TEXT_PAIRS: Array<[string, string]> = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['foreground', 'muted'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'],
  ['primary-foreground', 'primary'],
  ['primary', 'background'],
  ['primary', 'card'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['success-foreground', 'success'],
  ['warning-foreground', 'warning'],
  ['info-foreground', 'info'],
  ['destructive', 'background'],
  ['destructive', 'card'],
  ['success', 'background'],
  ['success', 'card'],
  ['warning', 'background'],
  ['warning', 'card'],
  ['info', 'background'],
  ['info', 'card'],
];

/** UI pairs that must reach WCAG AA non-text contrast (3:1). */
const UI_PAIRS: Array<[string, string]> = [
  ['ring', 'background'],
  ['ring', 'card'],
  ['input', 'background'],
  ['input', 'card'],
];

describe('design tokens', () => {
  it('defines a light and a dark theme', () => {
    expect(Object.keys(themes).sort()).toEqual(['dark', 'light']);
  });

  it('defines the same colour tokens in both themes', () => {
    expect(Object.keys(themes.dark!).sort()).toEqual(Object.keys(themes.light!).sort());
  });

  for (const theme of ['light', 'dark'] as const) {
    describe(`${theme} theme`, () => {
      it.each(TEXT_PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
        const colours = themes[theme]!;
        expect(colours[fg], `missing --color-${fg}`).toBeDefined();
        expect(colours[bg], `missing --color-${bg}`).toBeDefined();
        expect(contrastRatio(colours[fg]!, colours[bg]!)).toBeGreaterThanOrEqual(4.5);
      });

      it.each(UI_PAIRS)('%s on %s reaches 3:1', (fg, bg) => {
        const colours = themes[theme]!;
        expect(contrastRatio(colours[fg]!, colours[bg]!)).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it.each([
    '--font-sans',
    '--font-display',
    '--font-mono',
    '--text-caption',
    '--text-label',
    '--text-body',
    '--text-lead',
    '--text-heading',
    '--text-title',
    '--text-display',
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--radius-xl',
    '--space-gutter',
    '--space-section',
    '--shadow-sm',
    '--shadow-md',
    '--shadow-lg',
    '--duration-fast',
    '--duration-base',
    '--duration-slow',
    '--ease-standard',
    '--ease-emphasized',
  ])('defines %s', (name) => {
    expect(css).toContain(`${name}:`);
  });

  it('turns motion off for people who ask for reduced motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
