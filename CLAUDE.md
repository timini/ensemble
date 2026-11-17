# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Read first

1. [docs/PRODUCT_VISION.md](./docs/PRODUCT_VISION.md): what the product is, who it is for, what we may and may not claim.
2. [docs/ROADMAP.md](./docs/ROADMAP.md): the active plan. Milestones M0 to M6 with checkbox tasks. This replaces the Phase 4 tasks (T235 onward) in `specs/001-we-need-to/tasks.md`.
3. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): how the code works today and the target design.
4. `.specify/memory/constitution.md` (v1.1.0): the development principles below come from it.

## Project overview

**Ensemble AI** sends one prompt to several LLMs in parallel, streams the answers side by side, scores how much they agree, and merges them into a consensus answer. The agreement score is the core of the product: low agreement warns the user that no single answer should be trusted.

Do not write copy claiming ensembles are more accurate than the best single model. The benchmarks do not support that yet (see the vision document).

Modes:

- **Free**: user's own provider keys, encrypted in the browser, providers called directly from the browser. Works today.
- **Pro**: sign-in with Firebase Auth, Stripe credits, model calls on the server. Not built yet (roadmap M5).
- **Mock**: developer and CI only, enabled with `NEXT_PUBLIC_MOCK_MODE=true`. Never show a Mock option to users.

## Repository structure

npm workspaces monorepo:

- `packages/app/`: Next.js 15 App Router app. Routes: `/` (redirects to `/config` today), `/config`, `/ensemble`, `/prompt`, `/review`, `/features`, `/about`, `/test-components` (dev only), `/api/trpc/[trpc]`.
- `packages/component-library/`: 55 atomic-design components (atoms, molecules, organisms) developed in Storybook. The app imports its source via a tsconfig alias.
- `packages/shared-utils/`: provider clients, registry, factory, similarity maths, Web Crypto helpers. Exports from `dist`; rebuild after changes with `npm run build --workspace=packages/shared-utils`.
- `packages/consensus-core`, `consensus-standard`, `consensus-majority`, `consensus-elo`, `consensus-council`: consensus strategies.
- `packages/eval/`: benchmark CLI. `packages/eval-baseline/`: Python lm-eval runner.
- `packages/e2e/`: Playwright suites.
- `packages/wireframes/`: standalone Next app, the UX source of truth. Not in the root workspaces; run `npm install` inside it.

**Development flow**: wireframes, then components, then application. The M4 redesign follows this order.

## Key commands

From the repo root:

```bash
npm install
npm run build --workspace=packages/shared-utils   # needed before the app builds or typechecks
npm run dev              # app in Free mode (http://localhost:3000)
npm run dev:mock         # app with mock providers
npm run dev:components   # Storybook (http://localhost:6006)
npm run build            # build all workspaces in dependency order
npm test                 # unit tests, all workspaces
npm run lint
npm run typecheck
```

From `packages/app`:

```bash
npm run check            # next lint + tsc --noEmit
npm run format:check
npm run format:write
npm run test             # vitest with coverage
npm run preview          # production build and start
```

## Architecture

### Tech stack

- **Framework**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS 3.4 with semantic tokens in `packages/component-library/src/styles/tokens.css`
- **State**: Zustand 5 with localStorage persistence (`ensemble-ai-store`)
- **Server**: tRPC 11 with TanStack Query 5, Firebase Admin for token verification
- **Testing**: Vitest and Testing Library (unit), Storybook test runner, Playwright (E2E)
- **Component catalogue**: Storybook 9
- **Linting and formatting**: ESLint and Prettier (not Biome, despite the constitution)
- **i18n**: react-i18next (English and French)
- **Monitoring**: Sentry
- **Hosting**: Firebase App Hosting, Terraform in `infra/terraform`

### Providers

`AIProvider` interface in `packages/shared-utils/src/providers/types.ts`. Six key providers: `openai`, `anthropic`, `google`, `xai`, `deepseek`, `perplexity`, plus `openai-compatible`, which covers any number of OpenAI-compatible endpoints (Ollama, LM Studio, OpenRouter and others; model ids carry the endpoint id, `ollama/llama3.2:3b`). Clients live in `shared-utils/src/providers/clients/<provider>/` and extend `base/BaseFreeClient.ts`.

Client modes:

- **Mock client**: lorem-ipsum streams for UI work and E2E tests.
- **Free clients**: direct browser calls with the user's key (`dangerouslyAllowBrowser: true`).
- **Pro client**: not built. `createProviderClient` throws for `pro`. Planned as `ProAPIClient` over the `streamTextEvents` tRPC subscription (M5).

Embeddings: OpenAI (`text-embedding-3-small`), Google (`gemini-embedding-2`) and OpenAI-compatible endpoints (the embedding model set on the endpoint) implement `generateEmbeddings`. Other providers throw `EmbeddingsNotSupportedError`. Only mock mode uses hash-based fake vectors.

Adding a provider with its own API touches about 20 files; adding an OpenAI-compatible service is one preset. Both are described in `docs/ARCHITECTURE.md`.

### Server (tRPC)

- Context and `protectedProcedure`: `src/server/api/trpc.ts` (verifies a Firebase ID token)
- Routers: `src/server/api/routers/` (`auth`, `provider`, and the T3 demo `post`, which M0 removes)
- Root router: `src/server/api/root.ts`
- Client hooks: `src/trpc/react.tsx`. Server caller: `src/trpc/server.ts`
- Server provider calls: `src/server/providers/providerService.ts`

No UI code calls tRPC yet. There is no client sign-in, database or Stripe code yet.

### Constitutional principles

From `.specify/memory/constitution.md` (v1.1.0):

- **Component modularity**: break UI into the smallest reusable components, files under 200 lines.
- **Component completeness**: every component has `.tsx`, `.stories.tsx`, `.test.tsx`, a TypeScript props interface and JSDoc.
- **Storybook as the catalogue**: every component variant has a story.
- **TDD**: tests before implementation, 80%+ coverage.
- **Atomic design**: atoms, molecules, organisms, templates, pages.
- **Design system**: Tailwind utilities and theme tokens only; dark and light themes; EN and FR from day one.
- **No hardcoding**: theme tokens for colours, i18n keys for text.

## Planning system

- Active plan: `docs/ROADMAP.md`. Work milestone by milestone and tick tasks off there.
- Historical spec: `specs/001-we-need-to/` (`spec.md`, `plan.md`, `tasks.md`). Phases 1 to 3 are mostly done. Its Phase 4 choices (NextAuth, Prisma, Postgres, Vercel) are superseded by the roadmap's Decisions section (Firebase Auth, Firestore, App Hosting).

Before starting a task:

1. Read the relevant milestone in the roadmap.
2. Check the functional requirement it refers to in `specs/001-we-need-to/spec.md`, if any.
3. Read the constitution if the task touches components.

## Development workflow

All changes to `main` go through a pull request with passing CI and at least one approval.

### Branch protection on `main`

- Required status checks: all CI jobs must pass.
- At least 1 approving review. Stale reviews are dismissed on new commits.
- No force pushes, no deletion.

### Standard workflow

1. **Branch**: `git checkout main && git pull && git checkout -b feature/<name>` (or `fix/<name>`, `docs/<name>`).
2. **Specs**: check the roadmap task and any related spec requirement.
3. **Tests first (mandatory)**:
   - Component tasks: Storybook story with all variants, then failing unit tests.
   - Page tasks: failing E2E test first.
4. **Code**: implement until tests pass. Files under 200 lines. Tailwind tokens. JSDoc.
5. **Quality checks**, and do not continue if any fail:
   ```bash
   # packages/app
   npm run check && npm run format:write && npm run build && npm test
   # packages/component-library (if changed)
   npm run lint && npm run test:unit && npm run test:storybook:ci
   # packages/e2e (if pages changed)
   npm run test:mock
   ```
6. **Commit** with a Conventional Commit prefix (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`):
   ```bash
   git commit -m "feat: <description>

   <detailed changes>"
   ```
7. **Docs**: tick the task in `docs/ROADMAP.md`. Update README or package docs if setup or behaviour changed.
8. **Pull request**:
   ```bash
   git push -u origin feature/<name>
   gh pr create --title "feat: <description>" --body "## Summary
   - <changes>

   ## Test plan
   - [ ] All CI checks pass
   - [ ] Tested locally"
   ```
9. **CI**: wait for all jobs (component library, shared utils, app lint/typecheck/build, mock E2E, static analysis). Fix and push again on failure.
10. **Review and merge** after approval.

### Task rules

1. One roadmap task is one complete cycle of the workflow above.
2. One task is one commit, or one commit for a tightly coupled group.
3. Tick the task in the roadmap right after the commit.
4. Quality checks must pass before committing.
5. Never skip tests.
6. Commit often; aim for 30 to 60 minute cycles.
7. Respect milestone dependencies listed in the roadmap.

## Mandatory development practices

### Feature development agents (always use)

For any development work:

1. **First**: use `feature-dev:code-explorer` to analyse the existing code, trace execution paths and understand patterns.
2. **Second**: use `feature-dev:code-architect` to design the change.
3. **After coding**: use `feature-dev:code-reviewer` to review for bugs, security issues and code quality.

Never skip the exploration step.

### Test-driven development (mandatory)

1. Write a failing test that shows the bug or specifies the behaviour.
2. Run it and confirm it fails.
3. Implement until it passes.
4. Refactor with tests green.
5. Confirm all existing tests still pass before committing.

### Never bypass git hooks (absolute rule)

1. Never use `--no-verify`.
2. Never use `--force` or `--force-with-lease`.
3. Never edit `.husky/pre-commit` or `.husky/pre-push` to skip checks.
4. Never disable hooks temporarily.
5. Never amend commits that are already pushed.

If a hook fails, fix the cause and run it again. If tests are flaky, fix the tests. If hooks are slow, improve the hooks through a normal pull request.

### Commit requirements

Before every commit:

```bash
npm run check   # lint + typecheck
npm run build   # production build
npm test        # all tests
```

Only commit when all tests pass.

## Component workflow

Component work comes in story, test, implementation order:

1. Story (`.stories.tsx`) with every variant. Commit.
2. Unit tests (`.test.tsx`) for every behaviour. Commit.
3. Implementation until tests pass. Commit.
4. Check in Storybook across themes, languages and states.

A component is not done until it has all five artifacts (`.tsx`, `.stories.tsx`, `.test.tsx`, interface, JSDoc) and passes all checks.

## Testing

- **Unit and integration**: Vitest and React Testing Library.
- **E2E**: Playwright in `packages/e2e` with three suites:
  - `mock-mode`: mock providers. Runs in CI before deploy.
  - `free-mode`: real provider keys. Runs after deploy against the deployed URL.
  - `pro-mode`: placeholder until M5.
- **Selectors**: `data-testid` only, never CSS classes.
- **Coverage**: 80% minimum per component.

### CI and deploy flow

1. CI on pull requests and `main`: component library, shared utils, app (lint, typecheck, build), mock E2E, static analysis.
2. On `main`, if CI passes: deploy to Firebase App Hosting (`.github/workflows/deploy.yml`).
3. After deploy: free-mode E2E against the deployed URL.

`eval-ci.yml` runs paid benchmark calls on pull requests that touch `packages/eval`. Roadmap M0 makes it manual to stop recurring spend.

### E2E commands

```bash
npm run test:mock --workspace=packages/e2e
npm run test:free --workspace=packages/e2e
E2E_BASE_URL=https://your-app.hosted.app npm run test:free --workspace=packages/e2e
npm run test:ui --workspace=packages/e2e
```

`E2E_MODE` (`mock` or `free`) picks the server mode. `E2E_BASE_URL` runs against a deployment instead of a local server.

## Environment variables

Keys for local development and eval runs live in `.env.local` at the repo root (gitignored), with `TEST_` prefixes (for example `TEST_GOOGLE_API_KEY`). CI maps these from secrets.

The eval package expects standard names (`GOOGLE_API_KEY`, `OPENAI_API_KEY` and so on):

```bash
export GOOGLE_API_KEY="your-key-here"
# or
GOOGLE_API_KEY=$(grep TEST_GOOGLE_API_KEY .env.local | cut -d= -f2) \
  node --import tsx packages/eval/bin/ensemble-eval.mjs quick-eval
```

`HF_TOKEN` (not prefixed) gives access to gated Hugging Face datasets such as HLE.

Server variables for the app are validated in `packages/app/src/env.js`; all are optional today.

## Important notes

- Component files must not exceed 200 lines.
- Mock mode is never user-facing. Never add a Mock card or button to the config UI.
- Free-mode keys are encrypted with AES-GCM via the Web Crypto API and never sent to our server.
- Streaming latency target: under 100 ms p95 from chunk receipt to display.
- All UI text uses i18n keys.
- Do not add AI or Claude attribution to commits, pull requests, code comments or docs.
