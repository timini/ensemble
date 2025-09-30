# Known Issues

## Tailwind CSS Not Loading in Storybook

**Status**: ✅ RESOLVED
**Impact**: Components now render with proper styles in Storybook
**Resolution Date**: 2025-09-30

### Problem

Tailwind CSS v4 styles were not being applied to components in Storybook. Components rendered structurally correct but without visual styling (colors, borders, shadows, etc.).

### Root Cause

Tailwind CSS v4's `@import "tailwindcss"` syntax and PostCSS plugin were incompatible with Storybook's Vite configuration, causing stories to timeout waiting for `#storybook-root`.

### Solution

Downgraded from Tailwind CSS v4 to v3.4.17 for better Storybook compatibility:

1. ✅ Uninstalled Tailwind v4 packages: `npm uninstall tailwindcss @tailwindcss/postcss`
2. ✅ Installed Tailwind v3: `npm install -D tailwindcss@^3.4.0 postcss autoprefixer`
3. ✅ Changed `globals.css` from v4 syntax to v3:
   ```css
   /* Before (v4): */
   @import "tailwindcss";

   /* After (v3): */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
4. ✅ Updated `tailwind.config.ts` with proper theme extension using CSS variables
5. ✅ Updated `postcss.config.js` to use standard plugins:
   ```js
   export default {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   };
   ```

### Verification

- All 38 Storybook stories now render with proper styling
- Screenshot testing confirms components have correct colors, borders, shadows, and spacing
- Visual regression testing automated via Playwright

### References

- Tailwind CSS v3 docs: https://tailwindcss.com/docs
- Storybook Vite config: https://storybook.js.org/docs/configure/styling-and-css
