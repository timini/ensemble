# @ai-ensemble/component-library

React components for the Ensemble AI app, built with TypeScript, Tailwind CSS 3.4 and Storybook 9. Components follow [shadcn/ui](https://ui.shadcn.com/) patterns (CVA variants, `cn()` class merging) and are grouped by [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) level.

The package is not built or published. It points `main` and `types` at `src/index.ts`, and the app imports components through its `@/*` path alias (mapped to `../component-library/src/*`), for example `import { Button } from '@/components/atoms/Button'`.

## Components

### Atoms (22)

Avatar, Badge, Button, Card, Dialog, Heading, Icon, InlineAlert, Input, Label, Link, LoadingSpinner, Markdown, ModelLogo, Progress, ProviderLogo, Rating, Select, Separator, Tag, Text, Textarea

### Molecules (10)

ApiKeyInput, ConsensusPresetSelector, EnsembleHeader, Footer, ModelCard, ModeSelectionCard, ProgressSteps, PromptInput, ResponseCard, SummarizerIndicator

### Organisms (16)

AgreementAnalysis, ApiKeyConfiguration, ApiKeyConfigurationModal, ConsensusCard, EnsembleConfigurationSummary, EnsembleManagementPanel, EnsembleSidebar, ManualResponseModal, ModelSelectionList, ModeSelector, PageHero, PromptCard, PromptInputWithHint, PromptTips, SettingsModal, WorkflowNavigator

There is no templates level. `src/components/foundations/ColorPalette.stories.tsx` documents the colour tokens.

Most components have a `.stories.tsx` and a `.test.tsx` next to them. Exceptions today: Dialog and Markdown have neither; PromptCard has a test but no story.

### Utilities

- `cn()` in `src/lib/utils.ts`: `clsx` plus `tailwind-merge`
- `src/lib/i18n/`: i18next config and EN/FR locale files used by components and Storybook
- `src/lib/test-utils/i18n-test-wrapper.tsx`: wraps components in the i18n provider for tests

## Scripts

| Script | Description |
|--------|-------------|
| `npm run storybook` | Storybook dev server on port 6006 |
| `npm run build-storybook` | Static Storybook build |
| `npm run build` | `tsc --noEmit` (type check only, no output) |
| `npm test` / `npm run test:unit` | `vitest run --coverage` |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:storybook` | Storybook test runner against a running Storybook |
| `npm run test:storybook:ci` | Builds Storybook, serves it, runs the test runner |
| `npm run lint`, `npm run lint:fix` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

`scripts/screenshot-stories.ts` screenshots a hard-coded list of 77 story ids into `screenshots/`. The ids use an old `ui-*` prefix, while stories are now titled `Atoms/...`, `Molecules/...` and `Organisms/...`, so the list needs updating before the script is useful. Nothing compares the screenshots automatically.

## Usage

```tsx
import { Button } from '@/components/atoms/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card';

export function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Button size="lg">Click me</Button>
      </CardContent>
    </Card>
  );
}
```

## Design system

Colours are CSS variables holding RGB triples, defined in `src/styles/globals.css` for `:root` (light) and `.dark`. `tailwind.config.ts` maps them to Tailwind colours (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `info`, `card`, `popover`, `border`, `input`, `ring`) and sets `darkMode: 'class'`. Radius comes from `--radius`. See [docs/TAILWIND_DESIGN_SYSTEM.md](docs/TAILWIND_DESIGN_SYSTEM.md).

## Testing

- Unit tests: Vitest with jsdom and React Testing Library. Coverage thresholds are 80% for lines, functions, branches and statements (`vitest.config.ts`).
- Storybook: `@storybook/test-runner` checks that every story renders. Theme and i18n decorators live in `.storybook/decorators/`.

See [docs/TESTING.md](docs/TESTING.md).

## Project structure

```
packages/component-library/
├── .storybook/          main.cjs, preview.ts, test-runner.ts, decorators/
├── docs/
├── scripts/             screenshot-stories.ts
├── screenshots/         story screenshots
├── src/
│   ├── components/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── foundations/
│   ├── lib/             utils.ts, similarity.ts, i18n/, test-utils/
│   ├── styles/          globals.css
│   └── index.ts         public exports
├── tailwind.config.ts
└── vitest.config.ts
```

## Component guidelines

- Use CVA for variants and export the variant function alongside the component.
- Export a props interface and add JSDoc.
- Use `React.forwardRef` where the component wraps a DOM element.
- Keep component files around 200 lines. A few are over (`ResponseCard`, `EnsembleSidebar`, `SettingsModal`).
- Use i18n keys for all user-visible text.
- Use `data-testid` for test selectors.

## Docs

- [ATOMIC_DESIGN_ARCHITECTURE.md](docs/ATOMIC_DESIGN_ARCHITECTURE.md)
- [COMPONENT_DEVELOPMENT_GUIDE.md](docs/COMPONENT_DEVELOPMENT_GUIDE.md)
- [TAILWIND_DESIGN_SYSTEM.md](docs/TAILWIND_DESIGN_SYSTEM.md)
- [TESTING.md](docs/TESTING.md)
- [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)
