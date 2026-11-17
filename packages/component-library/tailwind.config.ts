import type { Config } from 'tailwindcss';
import preset from './src/styles/tailwindPreset';

/** Storybook and unit tests. Theme values come from the shared preset. */
export default {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
} satisfies Config;
