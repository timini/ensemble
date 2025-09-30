# Ensemble AI

> Compare perspectives from multiple AI models to make better decisions

**Ensemble AI** is a web application that allows users to query multiple Large Language Models (LLMs) simultaneously, compare their responses with agreement analysis, and receive meta-analyses from a designated summarizer model.

## 🎯 Project Overview

**Core Value Proposition**: Make better decisions by comparing perspectives from multiple AI models (OpenAI, Anthropic, Google, XAI) rather than relying on a single model's response.

**Development Approach**: UI-first with strict Test-Driven Development (TDD). All UI components are built and tested in isolation before any backend integration.

**Current Phase**: Phase 1 - Component Library Development

## 📁 Project Structure

This is a monorepo with npm workspaces:

```
ai-ensemble/
├── packages/
│   ├── component-library/    # Reusable UI components with Storybook
│   └── wireframes/           # Reference wireframe implementation (design source of truth)
├── specs/                    # Feature specifications and planning documents
├── package.json             # Root workspace configuration
└── README.md                # This file
```

### Component Library (`packages/component-library/`)

Reusable UI components built with:
- **React 19** + **TypeScript 5**
- **Tailwind CSS** for styling
- **Storybook 9** for component documentation
- **Vitest** + **Testing Library** for unit tests (191 tests, 80%+ coverage)
- **i18next** for internationalization (EN/FR)

**Components Available:**
- UI Components: Avatar, Badge, Button, Card, Input, Label, Progress, Rating, Separator, Textarea
- Application Components: EnsembleHeader, ProgressSteps

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
# Start component library Storybook (port 6006)
npm run dev:components

# Start wireframes dev server (port 3001)
npm run dev

# Run all tests
npm test

# Run linter
npm run lint

# Type checking
npm run typecheck
```

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

### Unit Tests (Vitest + Testing Library)
- **Location**: `packages/component-library/src/components/`
- **Coverage**: 80%+ required per Constitution Principle VIII
- **Execution**: Every commit via pre-commit hook
- **Run**: `npm test` (all workspaces) or `npm run test:unit` (component library)

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

### ✅ Completed (Phase 1.1)
- Next.js 14 + TypeScript setup
- Tailwind CSS configuration with semantic tokens
- Storybook 9 with decorators (theme, i18n)
- Vitest + Testing Library setup
- 10+ UI components with stories and tests (191 tests passing)
- Dark mode support (light/dark themes)
- Internationalization (EN/FR)
- Pre-commit hooks (Husky + lint-staged)

### 🚧 In Progress
- Phase 1.1 documentation completion (this file)
- Remaining utility components (Icon, LoadingSpinner, Tag, InlineAlert)

### 📋 Next Steps
- Complete Phase 1.2-1.4: Atomic, molecular, organism components
- Phase 2: UI Integration with Mock API clients
- Phase 3: Free Mode with real provider APIs
- Phase 4: Pro Mode with backend services

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

**Version**: 0.1.0
**Phase**: 1.1 (Component Library Foundation)
**Last Updated**: 2025-09-30
**Constitution**: [`.specify/memory/constitution.md`](./.specify/memory/constitution.md)
