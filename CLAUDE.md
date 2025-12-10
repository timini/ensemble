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

All changes to `main` must go through a Pull Request with passing CI checks and at least one approval.

### Branch Protection Rules

The `main` branch is protected with:
- **Required status checks**: All CI jobs must pass (Component Library, Shared Utils, Wireframes, App, App E2E Mock Mode, Static Analysis)
- **Required reviews**: At least 1 approving review before merge
- **Stale review dismissal**: Reviews are dismissed when new commits are pushed
- **No force pushes**: History cannot be rewritten on main
- **No deletions**: The main branch cannot be deleted

### Standard Development Workflow

Follow this workflow for all changes:

#### 1. Create a Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/<descriptive-name>
# or: git checkout -b fix/<bug-description>
```

#### 2. Write/Update Specs
- Review or create specs in `specs/{feature-id}/spec.md`
- Check implementation plan in `specs/{feature-id}/plan.md`
- Update task list in `specs/{feature-id}/tasks.md`

#### 3. Write Tests (TDD - MANDATORY)
**For component tasks**:
- **Story First**: Create Storybook story (`.stories.tsx`) with all variants
- **Tests Before Code**: Write unit tests (`.test.tsx`) testing all behaviors
- Run tests (they should fail initially - this is correct TDD)

**For page tasks**:
- Write E2E test FIRST, then implement until tests pass

#### 4. Write Code
- Implement the feature/fix until tests pass
- Keep files under 200 lines
- Use Tailwind utility classes only
- Add JSDoc documentation

#### 5. Iterate Until Tests Pass
Run all quality checks locally:
```bash
# From packages/app
npm run check            # Linting + typecheck
npm run format:write     # Auto-format code
npm run build            # Ensure production build succeeds
npm test                 # All unit tests pass

# From packages/component-library (if applicable)
npm run lint
npm run test:unit
npm run test:storybook:ci

# From packages/e2e (if applicable)
npm run test:mock
```

**DO NOT** proceed if any check fails. Fix issues before committing.

#### 6. Commit Changes
```bash
git add .
git commit -m "feat: <description>

<detailed changes>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Use conventional commit format: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`

#### 7. Update Documentation
- Mark completed tasks as `[X]` in `specs/{feature-id}/tasks.md`
- Update README.md if setup changes
- Update spec.md with completion notes if applicable

#### 8. Push and Create Pull Request
```bash
git push -u origin feature/<descriptive-name>
gh pr create --title "feat: <description>" --body "## Summary
- <changes>

## Test plan
- [ ] All CI checks pass
- [ ] Tested locally

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

#### 9. Verify CI Passes
Wait for all CI jobs to complete:
- Component Library (lint + unit tests + Storybook tests)
- Shared Utils (tests)
- Wireframes (lint + build)
- App (lint + typecheck + build)
- App E2E Mock Mode (Playwright tests)
- Static Analysis

If any job fails, fix the issues and push again.

#### 10. Request Review and Merge
Once CI passes, request a review. After approval, merge the PR.

---

### Task-by-Task Execution

**CRITICAL**: Treat **EACH TASK** in `specs/{feature-id}/tasks.md` as a separate, complete unit of work.

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

## Mandatory Development Practices

### Feature Development Agents (CRITICAL - ALWAYS USE)

**YOU MUST ALWAYS USE feature-dev agents** for ANY development work. This is not optional. Before writing ANY code, you MUST:

1. **FIRST**: Use `feature-dev:code-explorer` to deeply analyze existing codebase features, trace execution paths, and understand patterns
2. **SECOND**: Use `feature-dev:code-architect` to design feature architectures and create implementation blueprints
3. **AFTER CODING**: Use `feature-dev:code-reviewer` to review for bugs, security issues, and code quality

**Launch these agents via the Task tool with the appropriate `subagent_type`.** Example:

```
Task(subagent_type="feature-dev:code-explorer", prompt="Analyze how model selection works...")
```

**NEVER skip the exploration phase.** You MUST understand the codebase before making ANY changes. Failing to use these agents leads to:
- Introducing bugs from misunderstanding existing code
- Breaking existing functionality
- Creating inconsistent patterns
- Wasting time on incorrect approaches

### Test-Driven Development (MANDATORY)
**TDD is non-negotiable.** For every change:
1. **Write a failing test first** that demonstrates the bug or specifies the new behavior
2. **Run the test** to confirm it fails (red phase)
3. **Implement the fix/feature** until the test passes (green phase)
4. **Refactor** if needed while keeping tests green
5. **Verify all existing tests still pass** before committing

### NEVER Bypass Git Hooks (ABSOLUTE RULE)

**This is an ABSOLUTE rule with NO exceptions:**

1. **NEVER use `--no-verify`** on any git command (commit, push, etc.)
2. **NEVER use `--force` or `--force-with-lease`** to push changes
3. **NEVER modify hook files** (`.husky/pre-commit`, `.husky/pre-push`) to skip checks
4. **NEVER disable hooks temporarily** "just this once"
5. **NEVER amend commits** that have already been pushed to remote

**If hooks fail, you MUST:**
- Fix the underlying issues (lint errors, test failures, etc.)
- Run the checks again until they pass
- Only then proceed with the commit/push

**Why this matters:**
- Hooks ensure code quality before it reaches the repository
- Bypassing hooks defeats the entire purpose of having quality gates
- It introduces bugs, breaks builds, and wastes everyone's time
- Force pushing rewrites history and can cause data loss and merge conflicts

**There are NO valid reasons to bypass hooks.** If tests are flaky, fix the tests. If linting is wrong, fix the code. If hooks are too slow, optimize the hooks themselves through proper channels - never bypass them.

### Git Commit Rules (STRICT)
Pre-commit hooks exist to enforce quality:
- Linting must pass
- Type checking must pass
- Tests must pass
- Formatting must be correct

If hooks fail, **fix the issues** rather than bypassing them.

### Commit Requirements
Before **every commit**, ensure:
```bash
npm run check        # Linting + typecheck must pass
npm run build        # Production build must succeed
npm test             # ALL tests must pass (not just new ones)
```

**Only commit when ALL tests pass.** A commit with failing tests breaks the build for everyone.

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
- Mock mode is development/testing only (NOT user-facing). Enable it via `NEXT_PUBLIC_MOCK_MODE=true` when running local Storybook/E2E; never expose a “Mock” card/button in `/config`.
- API keys in Free Mode are encrypted with AES-256 (Web Crypto API)
- Streaming latency target: <100ms p95
- All text uses i18n keys (no hardcoded strings)
