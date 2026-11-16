# Repository Guidelines

## Start here
Read `docs/PRODUCT_VISION.md`, then the active milestone in `docs/ROADMAP.md`, then `docs/ARCHITECTURE.md`. `CLAUDE.md` has the full workflow and rules. `specs/001-we-need-to/` is the original spec; its Phase 4 tasks are superseded by the roadmap.

## Project structure
Ensemble AI is an npm workspaces monorepo (`packages/*`). Reusable UI lives in `packages/component-library`. The Next.js app is `packages/app`. Provider clients and shared maths are in `packages/shared-utils`. Consensus methods are in `packages/consensus-*`. Benchmarks are in `packages/eval`. Playwright tests are in `packages/e2e`. `packages/wireframes` is the UX source of truth; it is not a root workspace, so run `npm install` and `npm run dev` inside it.

## Build, test and development commands
From the root: `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`. Entry points: `npm run dev` (app, Free mode), `npm run dev:mock` (mock providers), `npm run dev:components` (Storybook). Rebuild shared-utils after changing it: `npm run build --workspace=packages/shared-utils`. Inside `packages/app`, run `npm run check`, `npm run test` and `npm run format:check` before raising a PR. E2E: `npm run test:mock --workspace=packages/e2e`.

## Coding style
TypeScript, 2-space indentation, React 19 function components, Tailwind 3.4 utilities with semantic tokens. Atomic design folders (atoms, molecules, organisms). Components stay under 200 lines. Prettier with the Tailwind plugin is authoritative; ESLint config sits in each workspace. Use explicit prop interfaces and `react-i18next` keys for all text (English and French).

## Testing
The constitution requires TDD: write the Storybook story and the failing Vitest/Testing Library spec before the implementation. Target 80% coverage or more and cover states, locales and themes. Use `data-testid` selectors. Name tests after the unit (`ComponentName.test.tsx`).

## Commits and pull requests
Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`). Keep each PR to one roadmap task, name the milestone and task in the description, list the commands you ran, and add screenshots or Storybook links for visual changes. Never bypass hooks with `--no-verify` or force-push. Do not add AI attribution to commits or PRs.

## Constitution checklist
Before coding, read `.specify/memory/constitution.md` (v1.1.0). Follow the wireframes, then components, then app order. Each component ships with `.tsx`, `.stories.tsx`, `.test.tsx` and JSDoc. Record any deviation in the PR.
