# Known Issues

## Tailwind CSS Not Loading in Storybook

**Status**: 🔴 Needs Fix
**Impact**: Components render without styles in Storybook
**Priority**: High

### Problem

Tailwind CSS v4 styles are not being applied to components in Storybook. Components render structurally correct but without visual styling (colors, borders, shadows, etc.).

### What We've Tried

1. ✅ Added `src/styles/globals.css` with Tailwind v4 `@import "tailwindcss"`
2. ✅ Configured `postcss.config.js` with `@tailwindcss/postcss` plugin
3. ✅ Added `tailwind.config.ts` for content paths
4. ✅ Imported CSS in `.storybook/preview.ts`
5. ❌ Stories still timeout waiting for `#storybook-root`

### Likely Causes

- Tailwind v4 `@theme` directive may not be compatible with current setup
- PostCSS processing may not be working correctly in Vite/Storybook
- CSS import path or module resolution issue

### Next Steps

1. **Option A**: Downgrade to Tailwind CSS v3 (more stable Storybook support)
2. **Option B**: Debug Vite PostCSS configuration
3. **Option C**: Use pre-compiled CSS from app package
4. **Option D**: Wait for better Tailwind v4 + Storybook compatibility

### Workaround

Components work correctly in the main app (`packages/app`) which has working Tailwind v4 configuration. Visual testing can be done via:
- App demo page: `/demo`
- Unit tests pass (HTML structure correct)
- Storybook interaction tests pass

### References

- Tailwind CSS v4 docs: https://tailwindcss.com/docs/upgrade-guide
- Storybook Vite config: https://storybook.js.org/docs/configure/styling-and-css
- Issue opened: [Add link when created]
