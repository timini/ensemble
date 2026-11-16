# Tailwind Design System

The wireframes in `packages/wireframes/` show layout and flow. Colours come from the semantic tokens below, not from the raw Tailwind colours used in the wireframes.

## Overview

The component library uses Tailwind CSS 3.4 with semantic design tokens for light and dark themes. Tokens are CSS custom properties that hold space-separated RGB triples, so Tailwind's opacity modifiers work (for example `bg-primary/90`).

The same token values are defined twice: in `src/styles/globals.css` here (used by Storybook) and in `packages/app/src/styles/globals.css` (used by the app). Change both together.

## Design tokens

### Colours

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | `255 255 255` | `15 15 25` | Page background |
| `foreground` | `15 23 42` | `241 245 249` | Body text |
| `card` | `255 255 255` | `22 22 38` | Card backgrounds |
| `card-foreground` | `15 23 42` | `241 245 249` | Card text |
| `popover` | `255 255 255` | `22 22 38` | Popovers, tooltips |
| `popover-foreground` | `15 23 42` | `241 245 249` | Popover text |
| `primary` | `79 70 229` (indigo) | `129 140 248` | Primary actions, active states |
| `primary-foreground` | `255 255 255` | `15 15 25` | Text on primary |
| `secondary` | `241 245 249` | `30 30 50` | Secondary actions |
| `secondary-foreground` | `15 23 42` | `241 245 249` | Text on secondary |
| `muted` | `241 245 249` | `30 30 50` | Muted backgrounds |
| `muted-foreground` | `100 116 139` | `148 163 184` | Muted text |
| `accent` | `237 233 254` | `46 39 82` | Hover and highlight backgrounds |
| `accent-foreground` | `67 56 202` | `224 231 255` | Text on accent |
| `destructive` | `220 38 38` | `239 68 68` | Errors, danger actions |
| `destructive-foreground` | `255 255 255` | `255 255 255` | Text on destructive |
| `success` | `34 197 94` | `74 222 128` | Valid, completed |
| `success-foreground` | `15 23 42` | `15 15 25` | Text on success |
| `warning` | `245 158 11` | `251 191 36` | Warnings |
| `warning-foreground` | `15 23 42` | `15 15 25` | Text on warning |
| `info` | `59 130 246` | `96 165 250` | Informational |
| `info-foreground` | `255 255 255` | `15 15 25` | Text on info |
| `border` | `226 232 240` | `40 40 65` | Borders (applied to `*` by default) |
| `input` | `226 232 240` | `40 40 65` | Input borders |
| `ring` | `79 70 229` | `129 140 248` | Focus ring |

`src/components/foundations/ColorPalette.stories.tsx` renders these in Storybook.

### Border radius

`--radius` is `0.5rem`. `tailwind.config.ts` maps:

- `rounded-lg` to `var(--radius)` (0.5rem)
- `rounded-md` to `calc(var(--radius) - 2px)`
- `rounded-sm` to `calc(var(--radius) - 4px)`

`rounded` and `rounded-full` keep Tailwind's defaults.

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

Tailwind's default font stack and sizes in Storybook. The app sets `font-sans` to Geist. For headings and body text, use the `Heading` and `Text` atoms rather than raw classes where possible.

| Class | Weight | Usage |
|-------|--------|-------|
| `font-medium` | 500 | Labels, small headings |
| `font-semibold` | 600 | Section titles, card titles |
| `font-bold` | 700 | Page titles |

Text colours: `text-foreground` for body text, `text-muted-foreground` for secondary text.

## Component patterns

### Buttons

Use the `Button` atom's variants (`default`, `destructive`, `warning`, `success`, `outline`, `secondary`, `ghost`, `link`) rather than adding colour classes.

```tsx
<Button>Continue</Button>
<Button variant="outline">Back</Button>
```

### Validation states

`success` and `destructive` tokens mark valid and invalid inputs (see `ApiKeyInput`).

### Progress indicators

From `src/components/molecules/ProgressSteps/ProgressSteps.tsx`:

```tsx
isCompleted && 'bg-success text-success-foreground',
isActive && 'bg-primary text-primary-foreground',
!isCompleted && !isActive && 'bg-muted text-muted-foreground',
```

## Dark mode

`darkMode: 'class'`. The `dark` class on the root element switches the token values. The app's theme slice sets it on `document.documentElement`; Storybook's `ThemeDecorator` sets it from the toolbar.

Because tokens change with the theme, components using `bg-background`, `text-foreground` and similar need no `dark:` variants. Use `dark:` only for the rare case a token does not cover.

Check both themes in Storybook and keep text contrast at WCAG 2.1 AA (4.5:1).

## Responsive design

Tailwind's default breakpoints:

| Breakpoint | Min width |
|------------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

```tsx
// Stack on mobile, two columns from md
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

## Accessibility

- Focus: components use `focus-visible:ring-1 focus-visible:ring-ring` (Button) or similar. Keep a visible focus ring.
- Contrast: 4.5:1 for normal text, 3:1 for large text and interactive elements.
- Touch targets: aim for 44px by 44px on interactive elements.

## Usage guidelines

Do:

```tsx
<div className="bg-background text-foreground">
<p className="text-muted-foreground">
<div className="border border-border rounded-lg">
<Button variant="destructive">
```

Don't:

```tsx
<div className="bg-[#3b82f6]">        // arbitrary colour, use a token
<div className="bg-blue-600">         // raw palette colour, use primary
<Card className="bg-white">           // breaks dark mode, use bg-card
```

Some stories wrap content in `dark bg-gray-900` to preview dark mode; that is a story-only convenience.

## Tailwind configuration

`tailwind.config.ts` (abridged):

```ts
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        },
        // secondary, destructive, success, warning, info, muted, accent,
        // popover, card, border, input, ring
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

`packages/app/tailwind.config.ts` has the same theme plus a Geist `fontFamily.sans`, and adds `../component-library/src/**/*.{ts,tsx}` to `content` so component classes are generated in the app.

## References

- `packages/wireframes/app/`: layout reference
- `src/styles/globals.css`: token definitions
- [Tailwind CSS v3 docs](https://v3.tailwindcss.com/docs)
