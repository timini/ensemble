# Repository Guidelines

## Project Structure & Module Organization
Ensemble AI is an npm workspaces monorepo (`packages/*`). Build reusable UI in `packages/component-library`, wire up the production app in `packages/app` (Next.js App Router), and treat `packages/wireframes` as the UX source of truth. Shared specs, plans, and task lists live under `specs/`, while `.specify/` hosts the project constitution and automation scaffolding.

## Build, Test, and Development Commands
From the repo root use `npm run build|lint|test|typecheck` to execute every workspace. For focused work, `npm run dev` (app), `npm run dev:components` (Storybook), and `npm run dev:wireframes` are the entry points. Inside `packages/app`, pair `npm run dev` with `npm run check`, `npm run test`, `npm run test:e2e` (Playwright list reporter, headless), and `npm run format:check` before raising a PR. Use `npm run lint:fix` or `npm run format:write` only after capturing issues in tests.

## Coding Style & Naming Conventions
Code is TypeScript-first with 2-space indentation, React 19 functional components, and Tailwind utility classes. Follow atomic design folders (atoms → molecules → organisms) and keep components under 200 lines. Prettier (with the Tailwind plugin) is authoritative; ESLint config lives alongside each workspace. Prefer explicit prop interfaces, English i18n keys via `react-i18next`, and semantic Tailwind tokens over hardcoded values.

## Testing Guidelines
The constitution mandates TDD: write Storybook stories and Vitest/Testing Library specs before implementing UI. Target ≥80% coverage and exercise all states, locales, and themes. Run `npm run test` (unit) and `npm run test:e2e` (Playwright list reporter, no HTML) locally; snapshot any regressions against wireframes. Name tests after the component or task (`ComponentName.test.tsx`) and rely on `data-testid` selectors.

## Commit & Pull Request Guidelines
Commits follow conventional prefixes (`fix:`, `docs:`, `chore:`, etc.) as seen in `git log`. Keep PRs scoped to a single task from `specs/{feature-id}/tasks.md`, link the task ID in the description, summarize validation (commands run), and attach screenshots or Storybook links for visual changes. Request review only after passing lint, typecheck, and relevant tests.

## Constitution & Agent Checklist
Before coding, read `.specify/memory/constitution.md` (v1.1.0) and the active feature folder (currently `specs/001-we-need-to/`). Honor the wireframes → components → app flow, ensure each component ships with `.tsx`, `.stories.tsx`, `.test.tsx`, and JSDoc, and prefer mock clients until backend phases unlock. Refer back to `CLAUDE.md` for a deeper architecture primer, and document any deviations in the PR discussion.
