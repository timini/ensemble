# Design system and tokens

The visual system for Ensemble AI: colour, type, spacing, radius, elevation, focus and motion. It was refreshed in roadmap M4. The aim is a calm tool that reads clearly at a glance: warm paper neutrals, graphite text, one deep teal for actions and agreement, and status colours only where they carry meaning.

## Where things live

| File | What it holds |
|------|---------------|
| `src/styles/tokens.css` | Every token as a CSS variable, light (`:root`) and dark (`.dark`), plus the base rules every consumer needs: body font, `:focus-visible` outline, selection colour, `color-scheme`, reduced motion. Plain CSS, no Tailwind directives. |
| `src/styles/tailwindPreset.ts` | Tailwind preset that maps the variables to utilities, and adds the `focus-ring` utility. |
| `src/styles/globals.css` | Storybook entry: imports `tokens.css` and the Tailwind layers. |
| `src/styles/tokens.test.ts` | Checks WCAG contrast for every text and UI pairing in both themes, and that every token exists. |
| `src/lib/utils.ts` | `cn()`. Its `tailwind-merge` setup knows the semantic type sizes, so `text-lead text-muted-foreground` keeps both classes. |

Three consumers use the preset and import `tokens.css`: this package (Storybook and tests), `packages/app` (`tailwind.config.ts`, `src/styles/globals.css`) and `packages/wireframes`. Change a value in `tokens.css` and all three follow. Do not copy values into another config.

```ts
// tailwind.config.ts in a consumer
import preset from '../component-library/src/styles/tailwindPreset';
export default { presets: [preset], content: ['./src/**/*.{ts,tsx}'] };
```

## Colour

Colours are space separated RGB channels, so opacity modifiers work (`bg-primary/10`, `border-success/25`).

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `background` | `250 250 247` | `16 18 17` | Page |
| `foreground` | `24 26 25` | `233 236 233` | Body text |
| `card`, `card-foreground` | `255 255 255`, `24 26 25` | `24 27 26`, `233 236 233` | Cards, composer, panels |
| `popover`, `popover-foreground` | `255 255 255`, `24 26 25` | `29 33 31`, `233 236 233` | Menus, dialogs, sheets |
| `secondary`, `secondary-foreground` | `239 240 236`, `24 26 25` | `36 40 38`, `233 236 233` | Secondary buttons |
| `muted` | `242 242 238` | `33 37 35` | Hover fills, tracks, skeletons |
| `muted-foreground` | `88 94 90` | `160 168 163` | Secondary text, captions |
| `border` | `225 226 220` | `46 51 49` | Dividers and card edges (decorative) |
| `input` | `135 141 137` | `108 116 112` | Form control borders (3:1, so fields are findable) |
| `primary`, `primary-foreground` | `14 104 92`, `255 255 255` | `86 210 186`, `6 38 33` | Main actions, links, selection |
| `accent`, `accent-foreground` | `225 240 235`, `10 78 69` | `20 52 46`, `170 236 221` | Selected rows, active history item |
| `ring` | `14 104 92` | `86 210 186` | Focus outline |
| `success` | `22 117 58` | `92 214 138` | High agreement, valid key |
| `warning` | `156 82 0` | `240 184 64` | Mixed agreement, cautions |
| `destructive` | `186 32 44` | `248 118 118` | Low agreement, errors, delete |
| `info` | `30 86 196` | `132 176 255` | Neutral notices |

Each status colour has a `-foreground` partner for text on a solid fill.

Contrast rules, enforced by `tokens.test.ts`:

- 4.5:1 for every text pairing: `foreground` and `muted-foreground` on `background`, `card` and `muted`; every `X-foreground` on `X`; `primary`, `success`, `warning`, `destructive` and `info` used as text on `background` and `card`.
- 3:1 for `ring` and `input` against `background` and `card` (WCAG 1.4.11).

`border` is decorative and below 3:1 on purpose. Never let it be the only cue that something is interactive; controls carry text, an icon or an `input` border.

Tinted backgrounds (`bg-success/10`, `bg-warning/[0.06]`) take `text-foreground`, not the status colour, unless the text is short and bold.

## Type

Three families, loaded with `next/font/google` in the app and the wireframes, and from Google Fonts by name in Storybook (`.storybook/preview-head.html`). Each has a system fallback stack, so nothing breaks offline.

| Token | Family | Use |
|-------|--------|-----|
| `--font-sans` (`font-sans`) | Geist | Everything by default |
| `--font-display` (`font-display`) | Instrument Serif, weight 400 | The landing headline, page titles, empty states. Never below `text-title`. |
| `--font-mono` (`font-mono`) | Geist Mono | Keys, URLs, commands, code. Use `tabular-nums` on the sans face for numbers in running text. |

The apps set `--font-sans-loaded`, `--font-display-loaded` and `--font-mono-loaded` from `next/font`; `tokens.css` reads them with the family name as fallback.

Semantic type scale (`text-<step>`), size and line height from tokens:

| Step | Size | Line height | Use |
|------|------|-------------|-----|
| `caption` | 12px | 16px | Metadata, section eyebrows (with `uppercase tracking-wider`) |
| `label` | 14px | 20px | Controls, list rows, dense text |
| `body` | 16px | 26px | Answers and paragraphs |
| `lead` | 18px | 28px | The paragraph under a page title |
| `heading` | 20px | 28px, weight 600 | Card and sheet titles |
| `title` | 24px to 32px, fluid | 1.2, weight 600 | Page titles (weight 400 with `font-display`) |
| `display` | 36px to 60px, fluid | 1.05 | Landing headline, with `font-display` |

Tailwind's own `text-xs` to `text-6xl` still work for existing components. New work uses the semantic steps. The `Heading` atom has `size="title"` and `size="display"`; the `Text` atom has `variant="lead"`.

## Spacing

Tailwind's 4px scale, plus two layout tokens that grow with the viewport:

| Utility | 0 to 767px | 768px up | 1280px up | Use |
|---------|-----------|----------|-----------|-----|
| `px-gutter`, `gap-gutter` | 16px | 24px | 32px | Page side padding |
| `py-section` | 48px | 64px | 80px | Space between page sections |

Inside components, keep to 4, 8, 12, 16, 20 and 24px (`1`, `2`, `3`, `4`, `5`, `6`). Card padding is `p-6` (`p-5` for dense panels).

## Radius

| Utility | Value | Use |
|---------|-------|-----|
| `rounded-sm`, `rounded` | 6px | Small inline elements |
| `rounded-md` | 8px | Small buttons, menu items |
| `rounded-lg` | 12px | Buttons, inputs, selects |
| `rounded-xl` | 16px | Cards, menus |
| `rounded-2xl` | 24px | Sheets, the composer, large panels |
| `rounded-full` | | Chips, badges, avatars |

## Elevation

`shadow-sm` for resting cards and controls, `shadow-md` for the focused composer and hovered cards, `shadow-lg` for menus, dialogs and sheets. Dark mode uses deeper, black shadows; borders do most of the work there.

## Focus

Every focusable element shows a 2px outline in `ring` with a 2px offset on keyboard focus. `tokens.css` sets it for `:focus-visible` globally. Components that need it explicitly add the `focus-ring` utility. Text fields use a softer variant: `focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20`. Do not remove an outline without replacing it.

## Motion

| Token | Utility | Value | Use |
|-------|---------|-------|-----|
| `--duration-fast` | `duration-fast` | 120ms | Colour and hover changes |
| `--duration-base` | `duration-base` (default) | 180ms | Most transitions |
| `--duration-slow` | `duration-slow` | 280ms | Entering panels, meters |
| `--ease-standard` | `ease-standard` (default) | `cubic-bezier(0.2, 0, 0, 1)` | Everything |
| `--ease-emphasized` | `ease-emphasized` | `cubic-bezier(0.3, 0, 0, 1.2)` | Rare, for a small overshoot |

`animate-fade-in` and `animate-rise-in` cover overlays and menus. Motion only confirms what happened; nothing waits on it. Under `prefers-reduced-motion: reduce`, `tokens.css` cuts every animation and transition to near zero.

## Dark mode

`darkMode: 'class'`. The `dark` class on `<html>` swaps the token values. The app's theme slice sets it; Storybook's `ThemeDecorator` sets it from the toolbar and paints the story background. Components use tokens and need no `dark:` variants, with rare exceptions such as overlay scrims.

## Component patterns

- Buttons: use the `Button` variants (`default`, `outline`, `secondary`, `ghost`, `link`, `destructive`, `warning`, `success`). `default` is the one primary action per view.
- Status: `success`, `warning` and `destructive` mean high, mixed and low agreement as well as valid, caution and error. Keep that mapping.
- Eyebrows: `text-caption font-medium uppercase tracking-wider text-muted-foreground` above a panel's content, as in the workspace wireframes.

Do:

```tsx
<div className="rounded-xl border border-border bg-card p-5 shadow-sm">
<p className="text-label text-muted-foreground">
<h1 className="font-display text-display">
```

Don't:

```tsx
<div className="bg-[#3b82f6]">   // arbitrary colour, use a token
<div className="bg-blue-600">    // raw palette colour, use primary
<Card className="bg-white">      // breaks dark mode, use bg-card
```

## Responsive design

Tailwind's default breakpoints (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px). Check every screen at 375, 768 and 1440px in both themes. In the workspace, answers are swipeable tabs below `md` and columns from `md`; the history sidebar shows from `lg`.

## References

- `packages/wireframes`: layouts that use this system (`/states` lists every screen)
- `src/components/foundations/ColorPalette.stories.tsx`: colour swatches in Storybook
- [Tailwind CSS v3 docs](https://v3.tailwindcss.com/docs)
