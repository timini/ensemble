# Ensemble AI: Architecture

Last updated: 2026-11-15. Describes the code as it is, then the target design from [ROADMAP.md](./ROADMAP.md). Anything marked "Not built yet" is planned, not present.

## Packages

npm workspaces monorepo. Node 18+.

| Package | npm name | Purpose |
|---|---|---|
| `packages/app` | `@ai-ensemble/app` | Next.js 15 App Router app (React 19, Tailwind 3.4, Zustand 5, tRPC 11, TanStack Query 5, i18next) |
| `packages/component-library` | `@ai-ensemble/component-library` | 48 atomic-design components (22 atoms, 10 molecules, 16 organisms), Storybook 9, Vitest. The app imports its source through a tsconfig alias. |
| `packages/shared-utils` | `@ensemble-ai/shared-utils` | Provider clients, provider registry and factory, similarity maths, Web Crypto helpers. Exports from `dist`, so build it after changes. |
| `packages/consensus-core` | `@ensemble-ai/consensus-core` | `ConsensusStrategy` and `AIProvider` types shared by the strategies |
| `packages/consensus-standard` | `@ensemble-ai/consensus-standard` | One summarizer call merges all answers |
| `packages/consensus-majority` | `@ensemble-ai/consensus-majority` | LLM ranks answers by alignment, then synthesizes (2 calls). Not a mechanical vote. |
| `packages/consensus-elo` | `@ensemble-ai/consensus-elo` | Pairwise judging in both orders, ELO ranking, synthesis of the top 3. 2·C(N,2)+1 calls. |
| `packages/consensus-council` | `@ensemble-ai/consensus-council` | Critiques, rebuttals, validity votes, ELO and a summary. 56 extra calls for 5 models. |
| `packages/eval` | `@ensemble-ai/eval` | Benchmark CLI (`bin/ensemble-eval.mjs`): quick-eval, benchmark, baseline, compare, analyze and more |
| `packages/eval-baseline` | (Python) | lm-eval baseline runner |
| `packages/e2e` | `@ai-ensemble/e2e` | Playwright suites: `mock-mode`, `free-mode`, `pro-mode` (placeholder) |
| `packages/wireframes` | | Standalone Next app with the reference UX. Not in the root workspaces; install it separately. |

Other folders: `report/` (LaTeX benchmark study), `specs/001-we-need-to/` (original spec and task list), `.specify/` (constitution), `infra/terraform/` (Firebase and App Hosting), `.github/workflows/` (CI, deploy, eval).

## Request flow today (Free mode)

Everything happens in the browser. The server only serves pages.

1. The user enters provider keys on `/config`. `store/slices/apiKeySlice.ts` encrypts them with AES-GCM through `shared-utils/security` and Zustand persists them to localStorage (`ensemble-ai-store`).
2. On `/ensemble` the user picks models and a summarizer. Model lists come from `lib/models.ts` (hard-coded fallback) merged with live lists from `lib/providerModels.ts`, fetched only for providers with a valid key.
3. On `/prompt` the user writes the prompt and picks a consensus method (`standard | elo | majority | council`, `store/slices/ensembleSlice.ts`).
4. On `/review`:
   - `review/hooks/useStreamingResponses.ts` gets a client from `ProviderRegistry` and calls `streamResponse` for each model. Chunks are flushed to the store every 100 ms.
   - `review/hooks/useResponseEmbeddings.ts` calls `generateEmbeddings` for each answer, and `lib/agreement.ts` builds the pairwise similarity.
   - `review/hooks/useConsensusGeneration.ts` runs the chosen consensus strategy with the summarizer model.

Known gap: no provider implements `generateEmbeddings`. `BaseFreeClient` falls back to `MockProviderClient`, which returns vectors built from a hash of the text. Agreement scores are therefore not semantic. Fixing this is the first task in M1.

## Providers

- Interface: `AIProvider` in `shared-utils/src/providers/types.ts` (`streamResponse`, `generateEmbeddings`, `validateApiKey`, `listAvailableModels`, `listAvailableTextModels`, `generateStructured`).
- `ProviderName`: `openai | anthropic | google | xai | deepseek | perplexity`. `ProviderMode`: `mock | free | pro`.
- Clients live in `shared-utils/src/providers/clients/<provider>/`. All extend `base/BaseFreeClient.ts` (key check, 120 s stream timeout, error cleanup).
  - OpenAI, xAI, DeepSeek and Perplexity use the `openai` SDK; the last three set a fixed `baseURL`.
  - Anthropic uses `@anthropic-ai/sdk`. Google uses `@google/generative-ai` plus axios.
  - All set `dangerouslyAllowBrowser: true`.
- `factories/createProviderClient.ts` switches on provider and mode. `pro` throws "not yet implemented".
- `registry/ProviderRegistry.ts` is a singleton keyed by provider and mode. The app registers clients in `app/src/providers/index.ts`.

Adding a provider touches about 16 files: `types.ts`, `createProviderClient.ts`, `app/src/providers/index.ts`, `ensemble/page.constants.ts`, `config/hooks/useConfigPage.ts`, `store/slices/apiKeySlice.ts`, `ensembleSlice.ts`, `store/index.ts`, `lib/models.ts`, `lib/modelModalities.ts`, `review/hooks/useConsensusGeneration.ts`, server `providerService.ts` and `routers/provider.ts`, component-library `ProviderLogo.tsx`, `ModelLogo.tsx` and the `ApiKeyInput` provider type, `MockProviderClient.ts`, and the i18n JSON files.

## Server today

- tRPC 11 at `/api/trpc/[trpc]`. Routers in `app/src/server/api/routers/`:
  - `auth` (`me`)
  - `provider` (`listTextModels`, `streamText`, `streamTextEvents`), using server keys from `src/env.js` through `server/providers/providerService.ts`. `streamText` buffers the whole answer. Cancellation is a no-op.
  - `post` (leftover T3 demo).
- `protectedProcedure` verifies a Firebase ID token with Firebase Admin (`server/auth/firebaseAdmin.ts`). The client has no sign-in code yet, and no UI calls any tRPC procedure.
- Sentry is configured (`sentry.*.config.ts`). No database. No Stripe.

## Hosting today

- Firebase App Hosting, backend `ensemble-app` (`firebase.json`), configured by `apphosting.yaml`: 1 vCPU, 2 GiB, `minInstances: 1`, `maxInstances: 10`. The minimum of 1 means a server is billed while idle.
- `infra/terraform/` creates the Firebase project, App Hosting backend (id `ai-ensemble`, which does not match `firebase.json`), APIs, IAM and GitHub Workload Identity.
- `.github/workflows/deploy.yml` deploys on push to `main`, then runs the `free-mode` E2E suite against the deployed URL with real provider keys.

## Eval harness

- Datasets load from Hugging Face in `eval/src/lib/benchmarkDatasetLoaders.ts`: gsm8k, math500, truthfulqa, gpqa, mmlu_pro, simpleqa, hle, arc, hellaswag.
- Models are given as `provider:model`. Defaults are in `eval/src/lib/evalDefaults.ts`: `google:gemini-3-flash-preview`, which matches the committed caches in `eval/.cache/`.
- Scoring uses an LLM judge through `generateStructured` (`eval/src/lib/evaluators.ts`), with a regex fallback for numbers.
- Concurrency: AIMD limiter in `eval/src/lib/concurrencyPool.ts`.
- Known issues, all addressed in M3: TruthfulQA options are not shuffled; failed questions are dropped instead of counted wrong; cost uses mock prices; the same model often generates, merges and judges; `report/` data is not in the repo.

## Target design

```
Browser
  Free mode   -> provider APIs directly (cloud keys)
              -> OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, OpenRouter, Groq, Together)
  Pro mode    -> tRPC over SSE -> Next.js server on App Hosting (scale to zero)
                                    -> OpenRouter (server key in Secret Manager)
                                    -> Firestore (users, creditLedger, usage, presets, history, shares)
                                    <- Stripe webhook (credit purchases)
  Auth        -> Firebase Auth (Google, email link); ID token sent to tRPC
```

Changes from today, by milestone:

| Change | Milestone |
|---|---|
| Real `generateEmbeddings` for OpenAI, Google and OpenAI-compatible; one similarity implementation in shared-utils | M1 |
| Pricing table in shared-utils, used for estimates and actual cost | M1 |
| `FreeOpenAICompatibleClient` with configurable base URL and optional key | M2 |
| Eval harness accepts the OpenAI-compatible provider; methodology fixes | M3 |
| Single workspace route replacing the four wizard pages; history in IndexedDB | M4 |
| Client Firebase Auth, `ProAPIClient` over `streamTextEvents`, Firestore, credit ledger, Stripe routes | M5 |
| Shares with Firestore TTL, synced history | M6 |
| `apphosting.yaml`: `minInstances: 0`, `maxInstances: 3`, 1 GiB | M0 |
