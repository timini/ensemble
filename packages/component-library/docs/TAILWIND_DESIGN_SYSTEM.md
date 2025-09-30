# Tailwind Design System

Documentation for the custom Tailwind CSS design system used in @ai-ensemble/component-library.

## Overview

Our design system is built on Tailwind CSS 3.4 with custom theme tokens for consistent styling across all components. We use CSS variables for dynamic theming and support both light and dark modes.

## Color System

### Theme Colors

All colors are defined as CSS variables in `src/styles/globals.css` using RGB values with `<alpha-value>` support for opacity modifiers.

#### Light Mode (Default)
```css
:root {
  --color-background: 255 255 255;     /* Pure white */
  --color-foreground: 10 10 10;        /* Near black */
  --color-primary: 24 24 27;           /* Zinc-900 */
  --color-primary-foreground: 250 250 250;  /* Zinc-50 */
  --color-secondary: 244 244 245;      /* Zinc-100 */
  --color-secondary-foreground: 24 24 27;   /* Zinc-900 */
  --color-muted: 244 244 245;          /* Zinc-100 */
  --color-muted-foreground: 113 113 122;    /* Zinc-500 */
  --color-accent: 244 244 245;         /* Zinc-100 */
  --color-accent-foreground: 24 24 27;      /* Zinc-900 */
  --color-destructive: 239 68 68;      /* Red-500 */
  --color-destructive-foreground: 250 250 250;  /* Zinc-50 */
  --color-border: 228 228 231;         /* Zinc-200 */
  --color-input: 228 228 231;          /* Zinc-200 */
  --color-ring: 24 24 27;              /* Zinc-900 */
}
```

#### Dark Mode
```css
.dark {
  --color-background: 10 10 10;        /* Near black */
  --color-foreground: 250 250 250;     /* Near white */
  --color-primary: 250 250 250;        /* Near white */
  --color-primary-foreground: 24 24 27;     /* Zinc-900 */
  --color-secondary: 39 39 42;         /* Zinc-800 */
  --color-secondary-foreground: 250 250 250; /* Zinc-50 */
  --color-muted: 39 39 42;             /* Zinc-800 */
  --color-muted-foreground: 161 161 170;    /* Zinc-400 */
  --color-accent: 39 39 42;            /* Zinc-800 */
  --color-accent-foreground: 250 250 250;   /* Zinc-50 */
  --color-destructive: 127 29 29;      /* Red-900 (darker) */
  --color-destructive-foreground: 250 250 250; /* Zinc-50 */
  --color-border: 39 39 42;            /* Zinc-800 */
  --color-input: 39 39 42;             /* Zinc-800 */
  --color-ring: 212 212 216;           /* Zinc-300 */
}
```

### Usage in Tailwind

Colors are mapped in `tailwind.config.ts` with alpha support:

```typescript
colors: {
  border: 'rgb(var(--color-border) / <alpha-value>)',
  input: 'rgb(var(--color-input) / <alpha-value>)',
  ring: 'rgb(var(--color-ring) / <alpha-value>)',
  background: 'rgb(var(--color-background) / <alpha-value>)',
  foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
  primary: {
    DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
    foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
  },
  secondary: {
    DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
    foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
  },
  destructive: {
    DEFAULT: 'rgb(var(--color-destructive) / <alpha-value>)',
    foreground: 'rgb(var(--color-destructive-foreground) / <alpha-value>)',
  },
  muted: {
    DEFAULT: 'rgb(var(--color-muted) / <alpha-value>)',
    foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)',
  },
  accent: {
    DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
    foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
  },
  popover: {
    DEFAULT: 'rgb(var(--color-popover) / <alpha-value>)',
    foreground: 'rgb(var(--color-popover-foreground) / <alpha-value>)',
  },
  card: {
    DEFAULT: 'rgb(var(--color-card) / <alpha-value>)',
    foreground: 'rgb(var(--color-card-foreground) / <alpha-value>)',
  },
}
```

### Color Classes

```tsx
// Background colors
<div className="bg-primary" />
<div className="bg-secondary" />
<div className="bg-destructive" />
<div className="bg-muted" />

// Foreground (text) colors
<p className="text-primary-foreground" />
<p className="text-secondary-foreground" />
<p className="text-muted-foreground" />

// With opacity
<div className="bg-primary/50" />      // 50% opacity
<div className="bg-destructive/20" />  // 20% opacity
```

## Border Radius

Border radius is defined as a CSS variable for consistency:

```css
:root {
  --radius: 0.5rem;  /* 8px */
}
```

### Tailwind Configuration

```typescript
borderRadius: {
  lg: 'var(--radius)',                    // 8px
  md: 'calc(var(--radius) - 2px)',       // 6px
  sm: 'calc(var(--radius) - 4px)',       // 4px
}
```

### Border Radius Classes

```tsx
<div className="rounded-lg" />  // 8px
<div className="rounded-md" />  // 6px
<div className="rounded-sm" />  // 4px
<div className="rounded-full" /> // 9999px (circle)
```

## Typography

### Font Family

System font stack for optimal performance and native feel:

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Font Sizes (Tailwind Defaults)

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Small labels, captions |
| `text-sm` | 14px | 20px | Body text (default), form labels |
| `text-base` | 16px | 24px | Large body text |
| `text-lg` | 18px | 28px | Subheadings |
| `text-xl` | 20px | 28px | Headings (h4) |
| `text-2xl` | 24px | 32px | Headings (h3) |
| `text-3xl` | 30px | 36px | Headings (h2) |
| `text-4xl` | 36px | 40px | Headings (h1) |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, emphasized text |
| `font-semibold` | 600 | Subheadings, buttons |
| `font-bold` | 700 | Headings |

## Spacing

Tailwind's default spacing scale is used throughout:

| Class | Size | Pixels |
|-------|------|--------|
| `p-1`, `m-1` | 0.25rem | 4px |
| `p-2`, `m-2` | 0.5rem | 8px |
| `p-3`, `m-3` | 0.75rem | 12px |
| `p-4`, `m-4` | 1rem | 16px |
| `p-6`, `m-6` | 1.5rem | 24px |
| `p-8`, `m-8` | 2rem | 32px |
| `p-12`, `m-12` | 3rem | 48px |

### Common Spacing Patterns

```tsx
// Card padding
<Card className="p-6">...</Card>          // 24px all sides

// Form spacing
<div className="space-y-4">               // 16px vertical gap
  <Input />
  <Input />
</div>

// Button padding
<Button className="px-4 py-2">...</Button>  // 16px horizontal, 8px vertical
```

## Shadows

Tailwind's default shadow scale:

| Class | Usage |
|-------|-------|
| `shadow-sm` | Subtle elevation (inputs, cards) |
| `shadow` | Default elevation (buttons, cards) |
| `shadow-md` | Medium elevation (dropdowns) |
| `shadow-lg` | High elevation (modals, popovers) |
| `shadow-xl` | Maximum elevation (dialogs) |

## Component Patterns

### Button Variants

```tsx
// Primary button
className="bg-primary text-primary-foreground hover:bg-primary/90"

// Secondary button
className="bg-secondary text-secondary-foreground hover:bg-secondary/80"

// Destructive button
className="bg-destructive text-destructive-foreground hover:bg-destructive/90"

// Ghost button
className="hover:bg-accent hover:text-accent-foreground"

// Outline button
className="border border-input bg-background hover:bg-accent"
```

### Card Pattern

```tsx
className="bg-card text-card-foreground rounded-lg border border-border shadow-sm"
```

### Input Pattern

```tsx
className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
```

### Badge Pattern

```tsx
// Default badge
className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-semibold"

// Destructive badge
className="bg-destructive text-destructive-foreground border-transparent"
```

## Dark Mode

Dark mode is handled via the `.dark` class on the root element:

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark');

// In React/Next.js
<html className={isDark ? 'dark' : ''}>
```

All color CSS variables automatically switch when `.dark` is present.

## Responsive Design

Follow mobile-first approach with Tailwind's responsive prefixes:

```tsx
<div className="p-4 md:p-6 lg:p-8">    // 16px → 24px → 32px
<div className="text-sm md:text-base">  // 14px → 16px
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

### Breakpoints

| Prefix | Min Width | Device |
|--------|-----------|--------|
| `sm:` | 640px | Tablet portrait |
| `md:` | 768px | Tablet landscape |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Large desktop |
| `2xl:` | 1536px | Extra large desktop |

## Best Practices

1. **Use semantic color tokens**: Use `bg-primary` instead of `bg-zinc-900` for theme consistency
2. **Leverage CSS variables**: Allows dynamic theming without rebuilding
3. **Mobile-first responsive**: Start with mobile styles, add responsive prefixes for larger screens
4. **Consistent spacing**: Use spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px)
5. **Semantic HTML**: Use proper HTML elements (`<button>`, `<label>`, `<nav>`) for accessibility
6. **Border styles**: Apply `border-border` for consistent border colors across themes

## Global Styles

Applied to all elements in `globals.css`:

```css
@layer base {
  * {
    @apply border-border;  /* Consistent border color */
  }

  body {
    @apply bg-background text-foreground;  /* Theme colors */
  }
}
```

## Extending the Theme

To add new colors or modify the theme:

1. **Add CSS variable** in `globals.css`:
```css
:root {
  --color-custom: 100 150 200;
}
```

2. **Map in Tailwind config** in `tailwind.config.ts`:
```typescript
colors: {
  custom: 'rgb(var(--color-custom) / <alpha-value>)',
}
```

3. **Use in components**:
```tsx
<div className="bg-custom text-custom-foreground">
```

---

**Version**: 1.0
**Last Updated**: 2025-09-30
**Tailwind CSS**: v3.4.17
