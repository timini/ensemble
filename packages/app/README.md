# @ai-ensemble/app

The Ensemble AI web app. A Next.js 15 (App Router, React 19) app that sends one prompt to several models, shows their answers side by side, and asks a chosen summarizer model to produce a consensus answer.

UI components come from `packages/component-library`. Provider clients, encryption and similarity helpers come from `packages/shared-utils`. Consensus strategies come from the `packages/consensus-*` packages.

For where the product is going, see [docs/PRODUCT_VISION.md](../../docs/PRODUCT_VISION.md), [docs/ROADMAP.md](../../docs/ROADMAP.md) and [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).

## Routes

The app has one working screen, `/workspace` (`src/app/workspace/`): the composer on top (question, model chips, consensus method with calls and cost, options), then the agreement score and consensus answer, then every answer in columns (tabs on phones). History and presets sit in a sidebar, keys and appearance in a settings sheet. The old four-step wizard routes redirect into it.

| Route | Purpose |
|-------|---------|
| `/` | Redirects to `/workspace` (until the landing page lands) |
| `/workspace` | The workspace. `?panel=settings` opens settings, `?panel=models` the model picker, `?panel=prompt` focuses the question |
| `/config` | Redirects to `/workspace?panel=settings` (API keys, OpenAI-compatible endpoints such as Ollama, LM Studio and OpenRouter, embeddings provider, theme, language) |
| `/ensemble` | Redirects to `/workspace?panel=models` |
| `/prompt` | Redirects to `/workspace?panel=prompt` |
| `/review` | Redirects to `/workspace`, which shows the last run |
| `/about` | Static explainer with a flow diagram |
| `/features` | Static features page |
| `/benchmarks` | Benchmark results from `src/data/benchmark-summary.json` (accuracy with Wilson intervals, McNemar p-values, cost), or a "not run yet" state with the estimate and method |
| `/test-components` | Dev page that renders component-library buttons (404 in production unless `NEXT_PUBLIC_MOCK_MODE=true`) |
| `/api/trpc/[trpc]` | tRPC endpoint (see Server below) |

Consensus methods offered in the composer's method menu, each with its calls and cost before the run: `standard`, `elo`, `majority`, `council`. `standard`, `elo` and `council` are LLM-driven. `majority` first extracts a short final answer from each response with one structured call and counts the votes. On a tie, on long-form answers or when extraction fails, it falls back to the LLM rank-and-synthesize method.

## Modes

- **Free** (default, the only mode users can pick). The user pastes their own provider keys. Keys are encrypted with AES-256-GCM (Web Crypto) and stored in localStorage. Requests go directly from the browser to each provider using the vendor SDKs with `dangerouslyAllowBrowser`. There is no server in the loop.
- **Pro**. Not offered in the UI yet. `createProviderClient` throws "not yet implemented" for this mode. Not built yet, see [docs/ROADMAP.md](../../docs/ROADMAP.md).
- **Mock** (developer only). Set `NEXT_PUBLIC_MOCK_MODE=true` (or run `npm run dev:mock`). Every provider call uses `MockProviderClient`, which streams lorem ipsum. Used by the mock-mode Playwright suite in `packages/e2e`.

Supported providers: OpenAI, Anthropic, Google, xAI, DeepSeek, Perplexity, and any number of OpenAI-compatible endpoints (Ollama, LM Studio, llama.cpp, vLLM, OpenRouter, Groq, Together, custom). On first run the workspace looks for a running Ollama and offers to add it; see [docs/LOCAL_MODELS.md](../../docs/LOCAL_MODELS.md).

### Agreement scores

The workspace computes cosine similarity between response embeddings from OpenAI (`text-embedding-3-small`), Google (`gemini-embedding-2`) or an OpenAI-compatible endpoint with an embedding model (for example `nomic-embed-text` on Ollama). The provider is picked from the valid keys, OpenAI first, then Google, then an endpoint, and can be overridden in settings. Without any of them the agreement card says there is no score instead of showing one, links to settings, and gives the `ollama pull` command when a connected Ollama has no embedding model. Mock mode uses hash-based vectors, so its scores are not semantic.

## Scripts

Run from `packages/app` (or with `--workspace=packages/app` from the repo root).

| Script | What it does |
|--------|--------------|
| `dev` | Same as `dev:free` |
| `dev:free` | `next dev --turbo` with `NEXT_PUBLIC_MOCK_MODE=false` |
| `dev:mock` | `next dev --turbo` with `NEXT_PUBLIC_MOCK_MODE=true` |
| `build` | `next build`, then `scripts/flatten-standalone.mjs` |
| `apphosting:build` | Builds the consensus and shared-utils packages, then the app (used by Firebase App Hosting) |
| `start` | Copies static assets into `.next/standalone` and runs the standalone server |
| `preview` | `next build && next start` |
| `local` | `bin/ensemble-local.mjs`: builds the workspace if needed and serves the app on `http://localhost:3000` for local models (also `npm run local` at the root, and the `ensemble-local` bin) |
| `check` | `next lint && tsc --noEmit` |
| `lint`, `lint:fix` | `next lint` |
| `typecheck` | `tsc --noEmit` |
| `format:check`, `format:write` | Prettier |
| `test` | `vitest run --coverage` |
| `test:watch`, `test:ui` | Vitest watch mode and UI |
| `test:integration:provider-auth` | Runs `src/server/api/__tests__/provider-router.integration.test.ts` |
| `firebase:test-user:ensure` | `scripts/ensure-firebase-test-user.mjs` |

## Environment variables

Validated in `src/env.js` with `@t3-oss/env-nextjs`. All are optional except `NODE_ENV`. Set `SKIP_ENV_VALIDATION=1` to skip validation.

Server:

- `NODE_ENV`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Firebase Admin credentials for verifying ID tokens on tRPC calls
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY`, `PERPLEXITY_API_KEY`: used only by the server-side provider router

Client:

- `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_RELEASE`: Sentry (configured in `sentry.*.config.ts`)

Not in `env.js` but read directly: `NEXT_PUBLIC_MOCK_MODE`.

## Where things live

| Path | Contents |
|------|----------|
| `src/app/` | Pages. Each workflow step keeps its page logic in a `hooks/` folder next to `page.tsx` |
| `src/providers/index.ts` | `initializeProviders()`: registers a mock and a free client per provider in the shared `ProviderRegistry` |
| `src/store/` | Zustand store (`index.ts`), slices in `slices/`, custom localStorage persistence in `middleware/` |
| `src/lib/` | Embeddings, agreement, model lists, validation, logging, i18n |
| `src/server/api/` | tRPC v11 routers: `auth`, `post` (leftover T3 demo), `provider` |
| `src/server/auth/firebaseAdmin.ts` | Firebase Admin token verification for `protectedProcedure` |
| `src/server/providers/providerService.ts` | Server-side provider calls behind the `provider` router |
| `src/trpc/` | tRPC React and server clients |
| `tests/` | Unit and integration tests |

Path aliases: `~/*` is `src/*`; `@/*` is `../component-library/src/*`.

## Server

`src/server/api/root.ts` mounts three routers. `provider` has `listTextModels`, `streamText` (a mutation that buffers the full response) and `streamTextEvents` (a subscription). `auth.me` and all `provider` procedures require a Firebase ID token, checked with Firebase Admin.

No UI code calls these routers today. There is no client-side Firebase sign-in and no billing code. The server path exists for the future Pro mode.

## More docs

- [docs/PROVIDER_ARCHITECTURE.md](./docs/PROVIDER_ARCHITECTURE.md)
- [docs/STATE_MANAGEMENT.md](./docs/STATE_MANAGEMENT.md)
- [docs/MOCK_CLIENT_SPECIFICATION.md](./docs/MOCK_CLIENT_SPECIFICATION.md)
