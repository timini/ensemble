import type { Config } from 'tailwindcss';
import preset from '../component-library/src/styles/tailwindPreset';

/** Theme values come from the component library preset (tokens.css). */
export default {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}', '../component-library/src/**/*.{ts,tsx}'],
} satisfies Config;
