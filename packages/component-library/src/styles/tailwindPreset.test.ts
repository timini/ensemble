import { describe, expect, it } from 'vitest';
import preset from './tailwindPreset';

const extend = preset.theme?.extend as Record<string, Record<string, unknown>>;

describe('tailwind preset', () => {
  it('uses class based dark mode', () => {
    expect(preset.darkMode).toBe('class');
  });

  it('maps every semantic colour to a CSS variable with alpha support', () => {
    const colours = extend.colors as Record<string, unknown>;
    expect(colours.background).toBe('rgb(var(--color-background) / <alpha-value>)');
    expect(colours.primary).toEqual({
      DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
      foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
    });
  });

  it('exposes the semantic type scale', () => {
    const sizes = extend.fontSize as Record<string, unknown>;
    for (const name of ['caption', 'label', 'body', 'lead', 'heading', 'title', 'display']) {
      expect(sizes[name], name).toBeDefined();
    }
  });

  it('exposes sans, display and mono font families', () => {
    const fonts = extend.fontFamily as Record<string, string[]>;
    expect(fonts.sans?.[0]).toBe('var(--font-sans)');
    expect(fonts.display?.[0]).toBe('var(--font-display)');
    expect(fonts.mono?.[0]).toBe('var(--font-mono)');
  });

  it('maps radius, shadow and motion scales to tokens', () => {
    expect((extend.borderRadius as Record<string, string>).lg).toBe('var(--radius-lg)');
    expect((extend.boxShadow as Record<string, string>).md).toBe('var(--shadow-md)');
    expect((extend.transitionDuration as Record<string, string>).DEFAULT).toBe(
      'var(--duration-base)',
    );
    expect((extend.transitionTimingFunction as Record<string, string>).DEFAULT).toBe(
      'var(--ease-standard)',
    );
    expect((extend.spacing as Record<string, string>).gutter).toBe('var(--space-gutter)');
  });

  it('ships a focus-ring utility plugin', () => {
    expect(preset.plugins?.length).toBeGreaterThan(0);
  });
});
