import type { Config } from 'tailwindcss';
import type { PluginAPI } from 'tailwindcss/types/config';

/**
 * Tailwind preset for Ensemble AI. Maps the CSS variables in tokens.css to
 * Tailwind utilities so the component library, the app and the wireframes
 * share one visual system. Consumers add their own `content` globs.
 *
 * @example
 * // tailwind.config.ts
 * import preset from '../component-library/src/styles/tailwindPreset';
 * export default { presets: [preset], content: ['./src/**\/*.tsx'] };
 */

const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;
const pair = (name: string) => ({ DEFAULT: token(name), foreground: token(`${name}-foreground`) });

const typeStep = (name: string, extra: Record<string, string> = {}) =>
  [`var(--text-${name})`, { lineHeight: `var(--leading-${name})`, ...extra }] as [
    string,
    Record<string, string>,
  ];

/**
 * Adds `focus-ring`: a 2px ring in the ring colour, shown for keyboard focus only.
 * Written as a plain plugin object rather than with `tailwindcss/plugin`, so the
 * preset has no runtime import and loads from packages that resolve their own
 * tailwindcss (the standalone wireframes).
 */
const focusRing = {
  handler: ({ addUtilities }: PluginAPI) => {
    addUtilities({
      '.focus-ring': {
        outline: '2px solid transparent',
        'outline-offset': '2px',
        '&:focus-visible': {
          outline: '2px solid rgb(var(--color-ring))',
        },
      },
    });
  },
};

const preset = {
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: pair('primary'),
        secondary: pair('secondary'),
        destructive: pair('destructive'),
        success: pair('success'),
        warning: pair('warning'),
        info: pair('info'),
        muted: pair('muted'),
        accent: pair('accent'),
        popover: pair('popover'),
        card: pair('card'),
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        caption: typeStep('caption', { letterSpacing: '0.01em' }),
        label: typeStep('label'),
        body: typeStep('body'),
        lead: typeStep('lead'),
        heading: typeStep('heading', { letterSpacing: '-0.01em', fontWeight: '600' }),
        title: typeStep('title', { letterSpacing: '-0.02em', fontWeight: '600' }),
        display: typeStep('display', { letterSpacing: '-0.01em', fontWeight: '400' }),
      },
      spacing: {
        gutter: 'var(--space-gutter)',
        section: 'var(--space-section)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-sm)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-lg)',
      },
      transitionDuration: {
        DEFAULT: 'var(--duration-base)',
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease-standard)',
        standard: 'var(--ease-standard)',
        emphasized: 'var(--ease-emphasized)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--duration-base) var(--ease-standard) both',
        'rise-in': 'rise-in var(--duration-slow) var(--ease-standard) both',
      },
    },
  },
  plugins: [focusRing],
} satisfies Config;

export default preset;
