# Known Issues

No open issues are tracked here. The entry below is kept as a record because it explains why the repo uses Tailwind 3.

## Tailwind CSS v4 did not load in Storybook (resolved 2025-09-30)

### Problem

With Tailwind CSS v4, Storybook rendered components without styles, and the test runner timed out waiting for `#storybook-root`.

### Cause

Tailwind v4's `@import "tailwindcss"` syntax and its PostCSS plugin did not work with Storybook's Vite setup at the time.

### Fix

The component library moved to Tailwind v3.4 (`tailwindcss` ^3.4.17 today):

1. Removed `tailwindcss` v4 and `@tailwindcss/postcss`; installed `tailwindcss@^3.4`, `postcss` and `autoprefixer`.
2. `src/styles/globals.css` uses the v3 directives:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
3. `tailwind.config.ts` maps CSS variables to theme colours.
4. `postcss.config.js` uses the standard plugins:
   ```js
   export default {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   };
   ```

The app and the wireframes are also on Tailwind 3.4. See [docs/TAILWIND_VERSION_COMPATIBILITY.md](../../../docs/TAILWIND_VERSION_COMPATIBILITY.md).

### References

- [Tailwind CSS v3 docs](https://v3.tailwindcss.com/docs)
- [Storybook styling and CSS](https://storybook.js.org/docs/configure/styling-and-css)
