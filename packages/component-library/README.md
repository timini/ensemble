# @ai-ensemble/component-library

React components for the Ensemble AI app, built with TypeScript, Tailwind CSS 3.4 and Storybook 9. Components follow [shadcn/ui](https://ui.shadcn.com/) patterns (CVA variants, `cn()` class merging) and are grouped by [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) level.

The package is not built or published. It points `main` and `types` at `src/index.ts`, and the app imports components through its `@/*` path alias (mapped to `../component-library/src/*`), for example `import { Button } from '@/components/atoms/Button'`.

## Components

### Atoms (27)

AgreementRing, Avatar, Badge, Button, Card, CommandSnippet, Dialog, EndpointLogo, Heading, Icon, InlineAlert, Input, Label, Link, LoadingSpinner, Logo, Markdown, ModelLogo, Progress, ProviderLogo, Rating, Select, Separator, Sheet, Tag, Text, Textarea

### Molecules (28)

AccuracyInterval, AgreementSummary, AnswerCard, ApiKeyInput, AppearanceSettings, BenchmarksNotRun, ComposerOptions, ConsensusAnswer, ConsensusPresetSelector, EmbeddingsProviderSelector, EndpointEmbeddingField, EndpointInput, EnsembleHeader, Footer, LocalServerHelp, MajorityVoteBreakdown, MethodMenu, ModelCard, ModelChip, ModelPicker, ModeSelectionCard, OllamaDetectedNotice, ProgressSteps, PromptInput, ResponseCard, ResponseErrorNotice, RunCostSummary, SummarizerIndicator

### Organisms (24)

AgreementAnalysis, AnswerColumns, ApiKeyConfiguration, ApiKeyConfigurationModal, AppShell, BenchmarkMethod, BenchmarkResultsTable, Composer, ConsensusCard, ConsensusPanel, EndpointConfiguration, EnsembleConfigurationSummary, EnsembleManagementPanel, EnsembleSidebar, HistorySidebar, ManualResponseModal, ModelSelectionList, ModeSelector, PageHero, PromptCard, PromptInputWithHint, PromptTips, SettingsModal, WorkflowNavigator

### M4 workspace

The app's `/workspace` screen is built from these parts. `Organisms/AppShell` has `WorkspaceEmpty`, `WorkspaceRunning` and `WorkspaceDone` stories that assemble them with sample data.

| Component | Role |
|-----------|------|
| `AppShell` | Header (history toggle, logo, links, settings, account slot), history sidebar from 1024 px or a sheet below, main content with a skip link |
| `HistorySidebar` | Past runs grouped by date with their agreement level (a run with no known time is listed last, with no date), search over the prompt and an optional hidden `searchText`, delete, presets |
| `Composer` | Prompt, model chips (`ModelChip`) with the inline `ModelPicker`, `MethodMenu` with calls and cost per method from `estimateRun`, the summarizer choice and the Ranked top N, `ComposerOptions` (manual answer, save preset), Ctrl or Cmd + Enter |
| `ConsensusPanel` | `AgreementSummary` (score ring, level, calibrated or uncalibrated label, pair scores, or why there is no score with a way into settings) next to `ConsensusAnswer` (answer, majority vote, compact `RunCostSummary`, or a not-saved note for a run reopened from history) |
| `AnswerColumns` | `AnswerCard` per model: columns from 768 px, swipeable tabs with arrow key support below, streaming, waiting and error states with a retry per model |
| `Sheet` | Radix dialog shown as a side panel from 768 px and a bottom sheet below; traps focus, closes on Escape, gives focus back to the control that opened it |
| `AppearanceSettings` | Theme and language as segmented radio groups, for the settings sheet |

The older wizard components (`ResponseCard`, `ConsensusCard`, `AgreementAnalysis`, `PromptCard`, `ProgressSteps`, `WorkflowNavigator` and others) are no longer used by the workspace. Some are still used elsewhere (`ApiKeyConfiguration`, `EndpointConfiguration` and `EmbeddingsProviderSelector` in the settings sheet, `EnsembleHeader` and `Footer` on the other pages); the rest can be removed in a later cleanup.

There is no templates level. `src/components/foundations/ColorPalette.stories.tsx` documents the colour tokens.

Every component has a `.stories.tsx` and a `.test.tsx` next to it.

### Utilities

- `cn()` in `src/lib/utils.ts`: `clsx` plus `tailwind-merge`
- `src/lib/i18n/`: i18next config and EN/FR locale files used by components, tests and Storybook
- `src/lib/usePopover.ts`: open state, outside click and Escape handling for the composer menus
- `src/lib/rovingFocus.ts`: arrow key, Home and End focus movement in lists
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

Every token (colour, type scale, fonts, spacing, radius, shadows, motion) is a CSS variable in `src/styles/tokens.css`, light in `:root` and dark in `.dark`, together with the shared base rules (body font, focus outline, reduced motion). `src/styles/tailwindPreset.ts` maps the variables to Tailwind utilities (`bg-primary`, `text-lead`, `font-display`, `rounded-xl`, `px-gutter`, `duration-fast`, `focus-ring` and so on) and sets `darkMode: 'class'`. This package, `packages/app` and `packages/wireframes` all use the preset and import `tokens.css`. `src/styles/tokens.test.ts` checks WCAG AA contrast for every text and UI pairing in both themes. See [docs/TAILWIND_DESIGN_SYSTEM.md](docs/TAILWIND_DESIGN_SYSTEM.md).

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
│   ├── styles/          tokens.css, tailwindPreset.ts, globals.css
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
