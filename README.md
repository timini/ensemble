# Ensemble AI

> Compare perspectives from multiple AI models to make better decisions

**Ensemble AI** is a web application that allows users to query multiple Large Language Models (LLMs) simultaneously, compare their responses with agreement analysis, and receive meta-analyses from a designated summarizer model.

## 🎯 Project Overview

**Core Value Proposition**: Make better decisions by comparing perspectives from multiple AI models (OpenAI, Anthropic, Google, XAI) rather than relying on a single model's response.

**Development Approach**: UI-first with strict Test-Driven Development (TDD). All UI components are built and tested in isolation before any backend integration.

**Current Phase**: Phase 1 Complete ✅ | Ready for Phase 2 - UI Integration

## 📁 Project Structure

This is a monorepo with npm workspaces:

```
ai-ensemble/
├── packages/
│   ├── app/                # Production Next.js 15 App Router experience
│   ├── component-library/  # Reusable UI system + Storybook
│   ├── shared-utils/       # Provider clients, similarity math, crypto helpers
│   └── wireframes/         # UX source of truth (static reference flows)
├── docs/                   # Architecture primers, provider specs, decision records
├── specs/                  # Active feature specs, task lists, planning artifacts
├── scripts/                # Repo automation (FTA enforcement, etc.)
├── run/                    # Husky-managed Git hooks (Codex CLI harness)
├── package.json            # Root npm workspaces + shared scripts
└── README.md               # This file
```

### Component Library (`packages/component-library/`)

Reusable UI components built with:
- **React 19** + **TypeScript 5**
- **Tailwind CSS** for styling
- **Storybook 9** for component documentation
- **Vitest** + **Testing Library** for unit tests (**970 tests, 100% coverage**)
- **i18next** for internationalization (EN/FR)

**Components Available (39 total):**
- **Atoms (19)**: Avatar, Badge, Button, Card, Dialog, Heading, Icon, InlineAlert, Input, Label, Link, LoadingSpinner, Progress, Rating, Select, Separator, Tag, Text, Textarea
- **Molecules (8)**: ApiKeyInput, EnsembleHeader, ModelCard, ModeSelectionCard, ProgressSteps, PromptInput, ResponseCard, SummarizerIndicator
- **Organisms (12)**: AgreementAnalysis, ApiKeyConfiguration, ConsensusCard, EnsembleConfigurationSummary, EnsembleManagementPanel, EnsembleSidebar, ManualResponseModal, ModelSelectionList, ModeSelector, PageHero, SettingsModal, WorkflowNavigator

### Shared Utilities (`packages/shared-utils/`)

Domain utilities (non-UI) used across the monorepo:
- **Similarity Calculations**: Cosine similarity, similarity matrix, agreement statistics for AI response analysis
- **Future utilities**: Encryption (AES-256), embeddings, streaming (Phase 2-3)

### Wireframes (`packages/wireframes/`)

Reference implementation showing the complete 4-step workflow:
1. **Config** - Mode selection and API key configuration
2. **Ensemble** - Model selection and ensemble management
3. **Prompt** - Prompt input and submission
4. **Review** - Response display and agreement analysis

**⚠️ Important**: The wireframes are the **source of truth for styling and UX patterns**. Component library implementations should match the wireframe designs.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ai-ensemble-8

# Install dependencies (all workspaces)
npm install
```

### Development

```bash
# Whenever you change packages/shared-utils, rebuild it so the dist bundle and published types stay in sync
npm run build --workspace=packages/shared-utils

# Start component library Storybook (port 6006)
npm run dev:components

# Start the main app in Free mode (real provider clients)
npm run dev

# Start the app in Mock mode (UI/dev-only sandbox; never shipped to users)
NEXT_PUBLIC_MOCK_MODE=true npm run dev:mock

# Start wireframes dev server (port 3001)
npm run dev:wireframes

# Run all tests
npm test

# Run E2E tests (see E2E Testing section below for details)
npm run test:mock --workspace=packages/e2e    # Mock mode (CI default)
npm run test:free --workspace=packages/e2e    # Free mode (requires API keys)

# Run linter
npm run lint

# Type checking
npm run typecheck
```

> **Mock mode is developer-only.** `npm run dev:mock` (or setting `NEXT_PUBLIC_MOCK_MODE=true`) is strictly for UI iteration, Storybook snapshots, and deterministic CI runs. The user-facing product exposes only **Free** and **Pro** modes on the Config page; shipping builds must never surface Mock mode as an option.

### Individual Workspace Commands

```bash
# Component library
cd packages/component-library
npm run storybook          # Start Storybook
npm run test:unit          # Run unit tests
npm run test:storybook:ci  # Run Storybook interaction tests
npm run lint               # Lint and format

# Wireframes
cd packages/wireframes
npm run dev                # Start Next.js dev server
npm run build              # Build production
npm run lint               # Lint
```

## 🎨 Design System

The project uses **Tailwind CSS** with semantic design tokens defined in `packages/component-library/src/styles/globals.css`.

**Key Design Tokens:**
- **Colors**: Semantic tokens (background, foreground, card, primary, secondary, muted, accent, destructive, border)
- **Dark Mode**: Full support via `.dark` class with CSS variables
- **Spacing**: Tailwind's default spacing scale
- **Typography**: Tailwind's default font system
- **Borders**: `--radius: 0.5rem` default border radius

**Refer to the wireframes** (`packages/wireframes/`) for visual design patterns and component usage.

For detailed design system documentation, see: [`packages/component-library/docs/TAILWIND_DESIGN_SYSTEM.md`](./packages/component-library/docs/TAILWIND_DESIGN_SYSTEM.md)

## 🧪 Testing Strategy

Testing is wired into CI with parallel jobs:
- **Component Library**: lint, unit tests, Storybook interaction tests
- **Shared Utils**: lint + unit tests
- **Wireframes**: lint + build verification
- **App**: lint, typecheck, production build
- **App E2E (Mock Mode)**: Playwright tests with mock API clients (always runs)
- **App E2E (Free Mode)**: Playwright tests with real API keys (runs when secrets configured)
- **Static Analysis**: `npm run analyze:fta`

### E2E Testing

E2E tests are organized into three test suites in `packages/e2e/`:

| Suite | Environment | When to Use | CI Behavior |
|-------|-------------|-------------|-------------|
| **mock-mode** | `NEXT_PUBLIC_MOCK_MODE=true` | UI testing, CI default | Always runs |
| **free-mode** | Real API calls | Integration testing | Runs when `TEST_*_API_KEY` secrets configured |
| **pro-mode** | Backend services | Phase 4 (placeholder) | Not yet implemented |

**Running E2E Tests:**
```bash
# Mock mode (default, no API keys needed)
npm run test:mock --workspace=packages/e2e

# Free mode (requires API keys in .env.local or environment)
npm run test:free --workspace=packages/e2e

# Interactive UI mode for debugging
npm run test:ui --workspace=packages/e2e
```

**Environment Variables:**
- `E2E_MODE`: Controls which server mode to start (`mock` or `free`)
- `TEST_OPENAI_API_KEY`: OpenAI API key for free-mode tests
- `TEST_ANTHROPIC_API_KEY`: Anthropic API key for free-mode tests
- `TEST_GOOGLE_API_KEY`: Google API key for free-mode tests
- `TEST_XAI_API_KEY`: XAI API key for free-mode tests

**Test Structure:**
```
packages/e2e/
├── tests/
│   ├── mock-mode/           # 68 tests with mock clients
│   │   ├── config-page.spec.ts
│   │   ├── ensemble-page.spec.ts
│   │   ├── prompt-page.spec.ts
│   │   ├── review-page.spec.ts
│   │   ├── full-workflow-mock.spec.ts
│   │   ├── theme-persistence.spec.ts
│   │   └── language-persistence.spec.ts
│   ├── free-mode/           # Tests with real API calls
│   └── pro-mode/            # Phase 4 placeholder
└── playwright.config.ts     # Dynamic server configuration
```

### Unit Tests (Vitest + Testing Library)
- **Location**: `packages/component-library/src/components/`
- **Coverage**: 80%+ required per Constitution Principle VIII
- **Execution**: Every commit via pre-commit hook
- **Run**: `npm test` (all workspaces) or `npm run test` within a workspace (collects coverage & enforces thresholds). Use the `test:watch` scripts (e.g., `npm run test:watch --workspace=packages/app`) for faster local loops without coverage overhead.

### Storybook Interaction Tests
- **Framework**: Storybook Test Runner
- **Coverage**: Component behavior and accessibility
- **Run**: `npm run test:storybook:ci` (in component-library)

### Visual Regression (Planned)
- **Framework**: Playwright screenshot testing
- **Baseline**: Established in Phase 1 completion

### Test-Driven Development (TDD)
Per Constitution Principle VIII, all components follow the TDD workflow:
1. Write Storybook story with all variants FIRST
2. Write unit tests BEFORE implementation
3. Implement until tests pass

## 🧱 Working with Shared Utilities

`packages/shared-utils` ships compiled JavaScript and type definitions under `dist/`. The app workspace imports from that bundle, so whenever you change the shared-utils source run:

```bash
npm run build --workspace=packages/shared-utils
```

before running `next lint`, `tsc`, or the app’s Playwright tests. The CI pipeline builds the package automatically in both the App and App E2E jobs, so keeping the dist folder fresh locally ensures you see the same behavior as CI.
4. Visual validation in Storybook

## 🔧 Component Development

### Creating a New Component

```bash
cd packages/component-library

# 1. Create component files
touch src/components/ui/MyComponent/MyComponent.tsx
touch src/components/ui/MyComponent/MyComponent.stories.tsx
touch src/components/ui/MyComponent/MyComponent.test.tsx

# 2. Write Storybook story FIRST (document all variants)
# 3. Write tests BEFORE implementation (TDD)
# 4. Implement component until tests pass
# 5. Verify in Storybook visually

# 6. Run tests
npm run test:unit

# 7. Check coverage
npm run test -- --coverage
```

### Component Requirements (Constitution)
- ✅ Max 200 lines per file (Principle II)
- ✅ Story documenting all variants, themes, languages (Principle III)
- ✅ Unit tests with 80%+ coverage (Principle VIII)
- ✅ TypeScript interface with JSDoc (Principle III)
- ✅ Dark mode support (Principle VII)
- ✅ i18n support for EN/FR (Principle VII)

For detailed development guide, see: [`packages/component-library/docs/COMPONENT_DEVELOPMENT_GUIDE.md`](./packages/component-library/docs/COMPONENT_DEVELOPMENT_GUIDE.md)

## 📝 Commit Discipline

### Commit Guidelines
- **Frequency**: Commit after completing each discrete task (every 30-60 minutes)
- **Atomicity**: One commit per completed task
- **Format**: Use Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`)

### Commit Message Examples
```bash
✅ feat: add Avatar component with dark mode support
✅ test: add unit tests for Progress component
✅ fix: resolve streaming latency issue in ResponseCard
✅ docs: update Tailwind design system documentation

❌ update files
❌ wip
❌ fixes
```

### Pre-Commit Hooks (Husky)
Configured hooks run automatically on every commit (~15-30s):
1. **Linting**: ESLint + Prettier on staged files (via lint-staged)
2. **Type Checking**: `tsc --noEmit`
3. **Unit Tests**: Vitest tests (component library)

**⚠️ Never use `git commit --no-verify`** except in emergencies

## 📚 Documentation

- **Specifications**: [`specs/001-we-need-to/`](./specs/001-we-need-to/)
  - `spec.md` - Feature requirements (59 functional requirements)
  - `plan.md` - Implementation plan (4 phases, 14 weeks)
  - `tasks.md` - Detailed task breakdown (338 tasks)
- **Technical Docs**: `packages/component-library/docs/`
  - `TAILWIND_DESIGN_SYSTEM.md` - Design tokens and usage
  - `COMPONENT_DEVELOPMENT_GUIDE.md` - TDD workflow and best practices

## 🌍 Internationalization

The application supports **English (EN)** and **French (FR)**.

**Component Library**: Uses `react-i18next` with translation keys
**Storybook**: Locale toolbar for switching between EN/FR
**Translation Files**: `packages/component-library/src/lib/i18n/locales/`

## 🎭 Current Status

### ✅ Phase 1 Complete (v1.0.0-phase1)

**Component Library Development - COMPLETED**
- ✅ **39 components** with 100% test coverage (19 atoms, 8 molecules, 12 organisms)
- ✅ **948 passing tests** (component library) - Exceeded 80% coverage requirement
- ✅ **22 passing tests** (shared utilities) - Similarity calculations
- ✅ **Full i18n support** - English & French translations for all components
- ✅ **Storybook catalog** - 39+ stories documenting all component variants
- ✅ **Accessibility compliance** - WCAG 2.1 AA standards with aria-labels
- ✅ **Dark mode support** - Seamless light/dark theme switching
- ✅ **Shared utilities package** - Domain utilities (similarity, crypto, embeddings, streaming)
- ✅ **Complete documentation** - Design system, component guides, testing strategy

**Key Achievements:**
- 195% of target scope (39 vs 20+ planned components)
- 100% test coverage (vs 80% minimum)
- TDD methodology throughout
- Atomic design compliance

**Recent Commits:**
- `57254a4` - Similarity utilities and Phase 1 setup verification
- `5d596ed` - Comprehensive i18n support for all components
- `6db46c5` - SummarizerIndicator molecule
- `13f31d2` - Atomic design refactoring for organisms

### 📋 Next Steps (Phase 2)
- Provider architecture (AIProvider interface)
- Mock API clients for prototyping
- Page implementations (Config, Ensemble, Prompt, Review)
- E2E tests with Playwright
- Full workflow integration

## 🤝 Contributing

### Development Workflow
1. Pick a task from `specs/001-we-need-to/tasks.md`
2. Create feature branch: `git checkout -b feat/task-id-description`
3. Follow TDD workflow (story → tests → implementation)
4. Run tests: `npm test` (all pass before commit)
5. Commit with Conventional Commits format
6. Pre-commit hooks will validate automatically

### Code Quality Standards
- **No hardcoded colors**: Use semantic design tokens
- **No hardcoded text**: Use i18n translation keys
- **Test coverage**: Minimum 80% per component
- **TypeScript**: Strict mode enabled
- **Accessibility**: ARIA labels and keyboard navigation required

## 📄 License

Private project - All rights reserved

## 🔗 Links

- **Storybook**: http://localhost:6006 (after `npm run dev:components`)
- **Wireframes**: http://localhost:3001 (after `npm run dev`)
- **Specifications**: [`specs/001-we-need-to/spec.md`](./specs/001-we-need-to/spec.md)

---

**Version**: 1.0.0-phase1
**Phase**: Phase 1 Complete ✅ - Component Library
**Last Updated**: 2025-10-01
**Constitution**: [`.specify/memory/constitution.md`](./.specify/memory/constitution.md)
