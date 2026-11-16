# Atomic Design Architecture

This library groups components using [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) by Brad Frost: atoms, molecules, organisms. There is no templates level. Pages live in `packages/app`.

## Levels

### Atoms

Basic building blocks that cannot be broken down further without losing meaning. Single responsibility, controlled through props, little or no internal state.

Current atoms (22), in `src/components/atoms/`:

Avatar, Badge, Button, Card, Dialog, Heading, Icon, InlineAlert, Input, Label, Link, LoadingSpinner, Markdown, ModelLogo, Progress, ProviderLogo, Rating, Select, Separator, Tag, Text, Textarea

Dialog and Select wrap Radix primitives. Markdown wraps `react-markdown` with `remark-gfm`. ProviderLogo and ModelLogo use `@lobehub/icons`.

### Molecules

Small combinations of atoms with one focused purpose.

Current molecules (10), in `src/components/molecules/`:

ApiKeyInput, ConsensusPresetSelector, EnsembleHeader, Footer, ModelCard, ModeSelectionCard, ProgressSteps, PromptInput, ResponseCard, SummarizerIndicator

### Organisms

Larger sections made of molecules and atoms. They may hold UI state, but app state (Zustand, provider calls) stays in `packages/app` and is passed in as props and callbacks.

Current organisms (16), in `src/components/organisms/`:

AgreementAnalysis, ApiKeyConfiguration, ApiKeyConfigurationModal, ConsensusCard, EnsembleConfigurationSummary, EnsembleManagementPanel, EnsembleSidebar, ManualResponseModal, ModelSelectionList, ModeSelector, PageHero, PromptCard, PromptInputWithHint, PromptTips, SettingsModal, WorkflowNavigator

### Foundations

`src/components/foundations/ColorPalette.stories.tsx` is a story-only page that shows the colour tokens.

## Folder layout

Each component has its own folder:

```
src/components/atoms/Button/
├── Button.tsx
├── Button.stories.tsx
├── Button.test.tsx
├── Button.snapshot.test.tsx   (some atoms only)
└── index.ts
```

## Storybook titles

Story titles follow the level: `Atoms/Button`, `Molecules/ProgressSteps`, `Organisms/ModeSelector`.

## Exports

`src/index.ts` re-exports components and their prop types and variant helpers by name, plus `cn` from `src/lib/utils.ts`. The app does not import from the package name. It uses its `@/*` alias, which points at this package's `src/`:

```tsx
import { Button } from '@/components/atoms/Button';
import { ModeSelector } from '@/components/organisms/ModeSelector';
```

## Choosing a level

- **Atom**: one focused purpose, reused in several places, stands alone.
- **Molecule**: a common pattern made from a few atoms.
- **Organism**: a distinct section of a page, composed from molecules and atoms.

## Practices

### Compose rather than add props

```tsx
// Good: compose atoms
function FormField({ label, error, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <InlineAlert variant="error">{error}</InlineAlert>}
    </div>
  );
}

// Bad: an atom with too many props
function Input({ label, error, helperText, icon, ... }) {}
```

### Keep atoms pure

```tsx
// Good
function Button({ children, onClick, variant }) {
  return <button className={cn(variants[variant])} onClick={onClick}>{children}</button>;
}

// Bad: side effects in an atom
function Button({ children, onClick }) {
  const { trackEvent } = useAnalytics();
  return <button onClick={() => { trackEvent('click'); onClick(); }}>{children}</button>;
}
```

## References

- [Atomic Design methodology](https://bradfrost.com/blog/post/atomic-web-design/)
- [COMPONENT_DEVELOPMENT_GUIDE.md](./COMPONENT_DEVELOPMENT_GUIDE.md)
- [TAILWIND_DESIGN_SYSTEM.md](./TAILWIND_DESIGN_SYSTEM.md)
