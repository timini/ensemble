import type { Config } from "tailwindcss"
import preset from "../component-library/src/styles/tailwindPreset"

// Same preset and tokens as the app and Storybook, so the wireframes show the real visual system.
export default {
  presets: [preset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
} satisfies Config
