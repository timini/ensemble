# Tailwind Design System

> **Source of Truth**: This document is based on the wireframe implementations in `packages/wireframes/`, which serve as the design reference for all component library implementations.

## Overview

The Ensemble AI component library uses **Tailwind CSS** with semantic design tokens for consistent styling across light and dark themes. All color values use RGB format with CSS custom properties for easy theme switching.

## Design Tokens

### Color System

Defined in `src/styles/globals.css` using CSS custom properties:

#### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | `rgb(255 255 255)` | `rgb(10 10 10)` | Page background |
| `foreground` | `rgb(10 10 10)` | `rgb(250 250 250)` | Body text |
| `card` | `rgb(255 255 255)` | `rgb(10 10 10)` | Card backgrounds |
| `card-foreground` | `rgb(10 10 10)` | `rgb(250 250 250)` | Card text |
| `primary` | `rgb(24 24 27)` | `rgb(250 250 250)` | Primary actions |
| `primary-foreground` | `rgb(250 250 250)` | `rgb(24 24 27)` | Text on primary |
| `secondary` | `rgb(244 244 245)` | `rgb(39 39 42)` | Secondary actions |
| `secondary-foreground` | `rgb(24 24 27)` | `rgb(250 250 250)` | Text on secondary |
| `muted` | `rgb(244 244 245)` | `rgb(39 39 42)` | Muted backgrounds |
| `muted-foreground` | `rgb(113 113 122)` | `rgb(161 161 170)` | Muted text |
| `accent` | `rgb(244 244 245)` | `rgb(39 39 42)` | Accent backgrounds |
| `accent-foreground` | `rgb(24 24 27)` | `rgb(250 250 250)` | Text on accent |
| `destructive` | `rgb(239 68 68)` | `rgb(127 29 29)` | Error/danger actions |
| `destructive-foreground` | `rgb(250 250 250)` | `rgb(250 250 250)` | Text on destructive |
| `border` | `rgb(228 228 231)` | `rgb(39 39 42)` | Border color |
| `input` | `rgb(228 228 231)` | `rgb(39 39 42)` | Input borders |
| `ring` | `rgb(24 24 27)` | `rgb(212 212 216)` | Focus ring |

#### Wireframe-Specific Colors

From `packages/wireframes/app/config/page.tsx` and other wireframe pages:

| Usage | Class | Color | Notes |
|-------|-------|-------|-------|
| Page Background | `bg-gray-50` | Light gray | Main page background |
| Primary Button | `bg-blue-600 hover:bg-blue-700` | Blue | Call-to-action buttons |
| Secondary Button | `bg-gray-100 hover:bg-gray-200` | Light gray | Secondary actions |
| Success State | `border-green-300 bg-green-50` | Green | Valid/connected inputs |
| Success Text | `text-green-600` | Green | Validation messages |
| Success Icon | `text-green-500` | Green | Check icons |
| Card Border | `border-2 hover:border-blue-200` | Blue on hover | Interactive cards |
| Headings | `text-gray-900` | Dark gray | Page titles, headings |
| Body Text | `text-gray-600` | Medium gray | Descriptions, labels |
| Icon Background | `bg-blue-100` | Light blue | Icon container circles |
| Icon Foreground | `text-blue-600` | Blue | Icon colors |

### Border Radius

Default border radius: `0.5rem` (8px)

```css
--radius: 0.5rem;
```

Applied via Tailwind utility classes:
- `rounded` - Default radius (0.5rem)
- `rounded-full` - Circular (9999px) - used for avatars, icon containers
- `rounded-lg` - Large radius (0.75rem)

### Spacing

Uses Tailwind's default spacing scale based on `0.25rem` (4px) increments:

| Class | Value | Usage |
|-------|-------|-------|
| `space-x-2` / `space-y-2` | 0.5rem (8px) | Tight spacing |
| `space-x-3` / `space-y-3` | 0.75rem (12px) | Default spacing |
| `space-x-4` / `space-y-4` | 1rem (16px) | Medium spacing |
| `space-x-6` / `space-y-6` | 1.5rem (24px) | Section spacing |
| `px-6 py-8` | 1.5rem / 2rem | Page padding |
| `mb-8` / `mb-12` | 2rem / 3rem | Section margins |

### Typography

Uses Tailwind's default font system with custom weights and sizes:

#### Headings

```tsx
// Page titles
<h2 className="text-3xl font-bold text-gray-900 mb-4">

// Section titles
<h3 className="text-lg font-semibold mb-6">

// Card titles
<h4 className="text-xl font-semibold">
```

#### Body Text

```tsx
// Primary text
<p className="text-gray-600">

// Small text
<span className="text-sm text-green-600 font-medium">

// Muted text
<span className="text-gray-400">
```

#### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-medium` | 500 | Labels, small headings |
| `font-semibold` | 600 | Section titles, card titles |
| `font-bold` | 700 | Page titles |

## Component Patterns

### Cards

From wireframes (`packages/wireframes/app/config/page.tsx:54`):

```tsx
<Card className="border-2 hover:border-blue-200 transition-colors">
  <CardContent className="p-6">
    {/* Card content */}
  </CardContent>
</Card>
```

**Pattern**: 2px border with hover state transition

### Buttons

From wireframes:

```tsx
// Primary action
<Button className="bg-blue-600 hover:bg-blue-700">

// Full width
<Button className="w-full bg-blue-600 hover:bg-blue-700">
```

**Pattern**: Blue background, darker on hover

### Inputs with Validation

From wireframes (`packages/wireframes/app/config/page.tsx:100`):

```tsx
// Success state
<Input
  className="pr-20 border-green-300 bg-green-50"
  readOnly
/>

// With icons (show/hide password, validation)
<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
  <button className="text-gray-400 hover:text-gray-600">
    {showPassword ? <EyeOff /> : <Eye />}
  </button>
  <CheckCircle className="w-4 h-4 text-green-500" />
</div>
```

**Pattern**: Green border/background for valid states, icons positioned absolutely

### Icon Containers

From wireframes (`packages/wireframes/app/config/page.tsx:57`):

```tsx
<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
  <span className="text-blue-600 text-lg">🔧</span>
</div>
```

**Pattern**: Circular containers (10x10) with light background and colored icon

### Progress Indicators

From `packages/component-library/src/components/ProgressSteps/`:

```tsx
// Active step
<div className="bg-blue-500 text-white dark:bg-blue-600">

// Completed step
<div className="bg-green-500 text-white dark:bg-green-600">

// Upcoming step
<div className="bg-muted text-muted-foreground">
```

**Pattern**: Color-coded states with dark mode variants

## Dark Mode

### Enabling Dark Mode

Dark mode is controlled via the `.dark` class on the root element:

```tsx
<html className="dark">
  {/* All children inherit dark mode styles */}
</html>
```

### Dark Mode Classes

Use the `dark:` variant for dark mode styles:

```tsx
<div className="bg-white dark:bg-gray-900">
<p className="text-gray-900 dark:text-gray-100">
<div className="border-gray-200 dark:border-gray-800">
```

### Dark Mode Best Practices

1. **Always provide both variants**: Every background, text, and border should have light and dark variants
2. **Use semantic tokens**: Prefer `bg-background`, `text-foreground` over specific colors
3. **Test in both modes**: Visual validation required in Storybook with theme decorator
4. **Maintain contrast**: WCAG 2.1 AA compliance (4.5:1 ratio for text)

## Responsive Design

### Breakpoints

Uses Tailwind's default breakpoints:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

### Responsive Patterns

From wireframes:

```tsx
// Mobile: stack, Desktop: 2-column grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// Container with max width
<div className="max-w-4xl mx-auto px-6 py-8">
```

## Accessibility

### Focus States

Always include focus ring for keyboard navigation:

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
```

### Color Contrast

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18px+ or 14px+ bold): Minimum 3:1 contrast ratio
- **Interactive elements**: Minimum 3:1 against background

### Icon Sizing

Minimum touch target: 44px x 44px for interactive elements

```tsx
// Icon button (adequate touch target)
<button className="w-10 h-10 flex items-center justify-center">
  <Icon className="w-4 h-4" />
</button>
```

## Usage Guidelines

### DO ✅

```tsx
// Use semantic tokens
<div className="bg-background text-foreground">

// Provide dark mode variants
<Card className="bg-white dark:bg-gray-900">

// Use spacing scale consistently
<div className="space-y-4">

// Reference wireframes for patterns
<Button className="bg-blue-600 hover:bg-blue-700"> // From wireframes
```

### DON'T ❌

```tsx
// Don't hardcode arbitrary colors
<div className="bg-[#3b82f6]"> // Use semantic tokens instead

// Don't mix color scales
<div className="text-gray-600 dark:text-slate-200"> // Use same scale

// Don't skip dark mode
<Card className="bg-white"> // Missing dark variant

// Don't guess patterns
<Button className="bg-purple-500"> // Check wireframes first
```

## Tailwind Configuration

Located in `tailwind.config.ts`:

```ts
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        // ... other semantic tokens
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
    },
  },
  darkMode: "class",
  plugins: [],
}
```

## References

- **Wireframes**: `packages/wireframes/app/` - Design source of truth
- **Component Library**: `packages/component-library/src/components/` - Implementation
- **Globals CSS**: `packages/component-library/src/styles/globals.css` - Token definitions
- **Tailwind Docs**: https://tailwindcss.com/docs

---

**Version**: 1.0.0
**Last Updated**: 2025-09-30
**Design Reference**: `packages/wireframes/`
