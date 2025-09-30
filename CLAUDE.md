# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ensemble AI** is a web application that allows users to query multiple Large Language Models (LLMs) simultaneously and compare their responses. The project follows a strict **UI-first, Test-Driven Development (TDD)** approach across 4 progressive phases.

**Core Value Proposition**: Make better decisions by comparing perspectives from multiple AI models (OpenAI, Anthropic, Google, XAI) rather than relying on a single model's response.

## Repository Structure

This is a **monorepo** organized into three packages:

- **`packages/component-library/`**: UI component library containing all reusable atomic design components (atoms, molecules, organisms). All components are developed in isolation with Storybook as the primary development environment.
- **`packages/app/`**: The main Next.js application that consumes the component library and implements the full user-facing application with routing, state management, and provider integration.
- **`packages/wireframes/`**: Design wireframes and mockups that serve as the single source of truth for UI implementation.

**Development Flow**: wireframes → components → application

## Key Commands

All commands should be run from the `packages/app` directory:

```bash
cd packages/app

# Development
npm run dev              # Start Next.js dev server with Turbo
npm run build            # Build production application
npm start                # Start production server
npm run preview          # Build and start (for testing production builds)

# Code Quality
npm run check            # Run linter AND typecheck
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run typecheck        # Run TypeScript compiler (no emit)
npm run format:check     # Check Prettier formatting
npm run format:write     # Auto-format with Prettier
```

## Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Styling**: Tailwind CSS v4 (utility-first)
- **State Management**: Zustand with localStorage persistence
- **Backend Communication**: tRPC v11 (Phase 4+)
- **Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E)
- **Component Catalog**: Storybook 8+
- **Linting/Formatting**: ESLint + Prettier (NOT Biome, despite constitution mention)
- **i18n**: react-i18next (English & French)

### Application Structure

```
packages/app/src/
├── app/                    # Next.js App Router pages
│   ├── _components/        # Page-specific components
│   ├── api/trpc/[trpc]/    # tRPC API route handler
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── server/                 # Backend code (tRPC)
│   └── api/
│       ├── routers/        # tRPC route handlers
│       ├── root.ts         # Root tRPC router
│       └── trpc.ts         # tRPC initialization
├── trpc/                   # tRPC client setup
│   ├── query-client.ts     # React Query client
│   ├── react.tsx           # tRPC React hooks
│   └── server.ts           # Server-side tRPC caller
├── styles/                 # Global styles
└── env.js                  # Environment variable validation
```

### Development Phases

The project follows a **strict 4-phase delivery**:

1. **Phase 1 (4 weeks)**: Component Library - 20+ UI components in Storybook with 80%+ test coverage
2. **Phase 2 (3 weeks)**: UI Integration - Functional application using Mock API clients
3. **Phase 3 (3 weeks)**: Free Mode - Real provider API integration with client-side encrypted API keys
4. **Phase 4 (4 weeks)**: Pro Mode - Backend services, credit system, managed APIs via tRPC

**Current Status**: Early Phase 1 (initial setup, wireframes complete)

### User Workflow

The application implements a **4-step workflow**:

1. **Config**: Select operating mode (Free with own API keys, or Pro with managed service) and provide credentials
2. **Ensemble**: Select AI models to include and designate one as the "summarizer"
3. **Prompt**: Enter question/prompt and submit to ensemble
4. **Review**: View streaming responses, agreement analysis, and meta-analysis

### Provider Architecture

The `AIProvider` abstract class (frontend-only) supports three API client modes:

- **Mock Client**: Frontend-only, generates lorem ipsum streams (UI development & E2E tests)
- **Free Client**: Frontend-only, direct API calls to providers (Phase 3)
- **Pro Client**: Uses tRPC to call backend, which streams from providers (Phase 4)

Four providers: **XAI, OpenAI, Google (Gemini), Anthropic**

### Constitutional Principles

All development MUST adhere to `.specify/memory/constitution.md` (v1.1.0). Key principles:

- **UI-First**: Build ALL UI components BEFORE backend integration
- **Component Modularity**: Break down every UI element into smallest reusable components (200-line limit)
- **Component Completeness**: Every component requires: `.tsx` + `.stories.tsx` + `.test.tsx` + TypeScript interface + JSDoc
- **Storybook as SSOT**: Every component variant MUST have a story
- **TDD Mandatory**: Write tests BEFORE implementing component logic (80%+ coverage minimum)
- **Atomic Design**: Organize components as atoms → molecules → organisms → templates → pages
- **Design System**: Tailwind utility classes only; support dark/light themes and EN/FR languages from day one
- **No Hardcoding**: Use theme tokens (tailwind.config.js) and i18n keys

## Specification System

The project uses the `.specify/` workflow system:

- **Constitution**: `.specify/memory/constitution.md` - Governing principles (v1.1.0)
- **Feature Specs**: `specs/{feature-id}/spec.md` - Detailed requirements
- **Implementation Plans**: `specs/{feature-id}/plan.md` - Technical design
- **Task Lists**: `specs/{feature-id}/tasks.md` - Actionable implementation tasks

**Current Feature**: `specs/001-we-need-to/` (Complete Ensemble AI application)

When working on features, ALWAYS:
1. Read the constitution first
2. Check the feature spec for requirements
3. Review the implementation plan for technical decisions
4. Follow the task list for implementation order

## Development Workflow

**CRITICAL**: Treat **EACH TASK** in `specs/{feature-id}/tasks.md` as a separate, complete unit of work. Follow this workflow for every single task (T001, T002, T003, etc.) to maintain quality and consistency.

### Task-by-Task Execution

Each task goes through the complete 7-step workflow before moving to the next task:

### 1. Plan Work (Per Task)
- **Read the specific task** from `specs/{feature-id}/tasks.md` (e.g., T001, T033, T152)
- **Understand task context**:
  - Review task description and file paths
  - Check for dependencies (tasks without `[P]` may depend on previous tasks)
  - Review related requirements in `specs/{feature-id}/spec.md`
  - Check technical decisions in `specs/{feature-id}/plan.md`
- **Identify deliverables**: What files/artifacts will this task create or modify?

### 2. Write Tests (TDD - MANDATORY)
**For component tasks** (e.g., T033-T035, T036-T038):
- **Story First**: Create Storybook story (`.stories.tsx`) with all variants
- **Tests Before Code**: Write unit tests (`.test.tsx`) testing all behaviors
  - Test rendering, props, interactions, accessibility, states
  - Use `data-testid` selectors exclusively
  - Mock all external dependencies (Zustand, APIs)
- Run tests (they should fail initially - this is correct TDD)

**For setup/config tasks** (e.g., T001-T032):
- Write configuration first, then verify it works
- For tasks like T006a-T006c (pre-commit hooks), test the hook after setup

**For page tasks** (e.g., T152-T156):
- Write E2E test FIRST (e.g., T152), then implement page (T153-T156)

### 3. Implement Code (Per Task)
- Implement the specific task deliverable until tests pass
- **Follow task specification exactly** (file paths, naming, structure)
- Keep files under 200 lines (break down if needed)
- Use Tailwind utility classes only (no hardcoded colors/strings)
- Add JSDoc documentation
- For component tasks: Visually validate in Storybook (themes, languages, states)

### 4. Quality Gates (MUST PASS - Every Task)
Before committing **each task**, ensure all checks pass:

```bash
cd packages/app

# Run all quality checks
npm run check            # Linting + typecheck
npm run format:write     # Auto-format code
npm run build            # Ensure production build succeeds

# Run tests (when test suite is set up)
npm test                 # All unit tests pass with 80%+ coverage
```

**DO NOT** proceed to commit if any check fails. Fix issues before committing.

### 5. Commit Changes (One Commit Per Task)
Once quality gates pass for the current task:

```bash
git add .
git commit -m "feat: <task description> (T###)

<detailed changes from this specific task>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Examples**:
- `feat: initialize Next.js project with TypeScript and Tailwind (T001)`
- `feat: add Button component with stories and tests (T036-T038)`
- `test: add E2E test for config page (T152)`

**Important**:
- Reference the task ID (e.g., `T001`, `T036-T038`) in commit message
- One commit per task or logical task group (e.g., T036-T038 for Button component's 3 sub-tasks)
- Use conventional commit format: `feat:`, `test:`, `refactor:`, `docs:`, `chore:`

### 6. Update Documentation (Every Task)
After **each task** is committed:

- **REQUIRED**: Mark task as `[X]` in `specs/{feature-id}/tasks.md`
  ```markdown
  - [X] T001 Create Next.js 14 project with TypeScript
  ```
- **If phase/component complete**: Update `specs/{feature-id}/spec.md` with completion date
- **If setup changes**: Update README.md with new dependencies or instructions
- **At phase milestones**: Increment version number in spec.md

### 7. Move to Next Task
**ONLY** after completing steps 1-6 for the current task, move to the next task in the task list.

**Important**: Do not batch multiple tasks. Each task is a complete cycle through steps 1-7.

---

## Task Execution Patterns

### Pattern 1: Component Tasks (3-step)
Component tasks typically come in groups of 3 (story → test → implementation):

```markdown
- [ ] T033 Write Storybook story src/components/atoms/BaseCard.stories.tsx
- [ ] T034 Write unit tests src/components/atoms/BaseCard.test.tsx
- [ ] T035 Implement src/components/atoms/BaseCard.tsx
```

**Execution**:
1. **T033**: Create story → Quality gates → Commit → Mark [X]
2. **T034**: Write tests → Quality gates → Commit → Mark [X]
3. **T035**: Implement component → Quality gates → Commit → Mark [X]

**Alternative**: Execute T033-T035 as a single unit if they're tightly coupled, then commit once with all 3 tasks complete.

### Pattern 2: Setup/Config Tasks (independent)
Setup tasks are usually independent:

```markdown
- [ ] T001 Create Next.js 14 project
- [ ] T002 Initialize Git repository
- [ ] T003 [P] Install dependencies
```

**Execution**: Each task is completely independent → commit separately.

### Pattern 3: Page Tasks (E2E test first)
Page implementation follows TDD with E2E test first:

```markdown
- [ ] T152 Write E2E test tests/e2e/config-page.spec.ts
- [ ] T153 Create src/app/config/page.tsx
- [ ] T154 Wire to Zustand store
- [ ] T155 Add translations
- [ ] T156 Run E2E test and verify passing
```

**Execution**: T152 first (test will fail), then T153-T156 sequentially until test passes.

### Pattern 4: Parallel Tasks `[P]`
Tasks marked `[P]` can run in parallel (different files, no dependencies):

```markdown
- [ ] T003 [P] Install dependencies: zustand, react-i18next
- [ ] T004 [P] Install dev dependencies: storybook, vitest
- [ ] T005 [P] Install Playwright
```

**Execution**: Can execute simultaneously, but each still needs separate commit after completion.

---

## Key Rules

1. **One task = One complete workflow cycle** (steps 1-7)
2. **One task = One commit** (or logical task group like T036-T038)
3. **Mark `[X]` in tasks.md immediately after commit**
4. **Quality gates MUST pass before commit** (no exceptions)
5. **Never skip tests** (TDD is mandatory per Constitution Principle VIII)
6. **Never batch tasks without commits** (commit frequently, aim for 30-60 min cycles)
7. **Follow task order** (respect dependencies, execute sequentially unless marked `[P]`)

## Component Development Workflow (Detailed)

For component development specifically (Phase 1), tasks are structured as 3-step cycles:

**Task Group Example**: T033-T035 (BaseCard Component)
1. **T033 - Story**: Write Storybook story (`.stories.tsx`) with ALL variants
2. **T034 - Test**: Write unit tests (`.test.tsx`) for all behaviors
3. **T035 - Implementation**: Implement component until tests pass

**Complete cycle per component**:
1. Execute T033 (story) → commit → mark [X]
2. Execute T034 (test) → commit → mark [X]
3. Execute T035 (implementation) → commit → mark [X]
4. Validate in Storybook (themes, languages, states)
5. Move to next component (e.g., T036-T038 for Button)

**Key Rule**: A component is NOT done until it has all 5 artifacts (`.tsx`, `.stories.tsx`, `.test.tsx`, interface, JSDoc) and passes all quality gates.

## tRPC Setup

The application uses tRPC for type-safe backend communication (Phase 4+):

- **Context**: `src/server/api/trpc.ts` - Request context and middleware
- **Routers**: `src/server/api/routers/` - API route handlers
- **Root Router**: `src/server/api/root.ts` - Aggregates all routers
- **Client Hooks**: `src/trpc/react.tsx` - React Query hooks
- **Server Caller**: `src/trpc/server.ts` - Server-side API calls

Example procedure: `src/server/api/routers/post.ts` (demo endpoint)

## Design Tokens

All colors, spacing, and typography are defined in `tailwind.config.js`. Use semantic color names:
- `card`, `cardBorder`, `cardHover` (component-specific)
- `primary`, `secondary`, `accent` (brand colors)
- Dark mode via `dark:` variant

## Testing

- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright (uses Mock mode)
- **Visual Regression**: Chromatic + Storybook
- **Selectors**: Use `data-testid` exclusively (NEVER CSS classes)
- **Coverage Goal**: 80% minimum per component

## Important Notes

- Component files MUST NOT exceed 200 lines
- Mock mode is development/testing only (NOT user-facing)
- API keys in Free Mode are encrypted with AES-256 (Web Crypto API)
- Streaming latency target: <100ms p95
- All text uses i18n keys (no hardcoded strings)