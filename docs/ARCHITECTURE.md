# Ensemble AI: Architecture

Last updated: 2026-11-17. Describes the code as it is, then the target design from [ROADMAP.md](./ROADMAP.md). Anything marked "Not built yet" is planned, not present.

## Packages

npm workspaces monorepo. Node 18+.

| Package | npm name | Purpose |
|---|---|---|
| `packages/app` | `@ai-ensemble/app` | Next.js 15 App Router app (React 19, Tailwind 3.4, Zustand 5, tRPC 11, TanStack Query 5, i18next) |
| `packages/component-library` | `@ai-ensemble/component-library` | 55 atomic-design components (23 atoms, 15 molecules, 17 organisms), Storybook 9, Vitest. The app imports its source through a tsconfig alias. |
| `packages/shared-utils` | `@ensemble-ai/shared-utils` | Provider clients, provider registry and factory, similarity maths, Web Crypto helpers. Exports from `dist`, so build it after changes. |
| `packages/consensus-core` | `@ensemble-ai/consensus-core` | `ConsensusStrategy` and `AIProvider` types shared by the strategies |
| `packages/consensus-standard` | `@ensemble-ai/consensus-standard` | One summarizer call merges all answers |
| `packages/consensus-majority` | `@ensemble-ai/consensus-majority` | Mechanical vote on short final answers (1 structured call). On a tie, long-form answers or a failed extraction, an LLM ranks answers by alignment and synthesizes (2 more calls). |
| `packages/consensus-elo` | `@ensemble-ai/consensus-elo` | Pairwise judging in both orders, ELO ranking, synthesis of the top 3. 2·C(N,2)+1 calls. |
| `packages/consensus-council` | `@ensemble-ai/consensus-council` | Critiques, rebuttals, validity votes, ELO and a summary. 56 extra calls for 5 models. |
| `packages/eval` | `@ensemble-ai/eval` | Benchmark CLI (`bin/ensemble-eval.mjs`): quick-eval, benchmark, baseline, compare, analyze and more |
| `packages/eval-baseline` | (Python) | lm-eval baseline runner |
| `packages/e2e` | `@ai-ensemble/e2e` | Playwright suites: `mock-mode`, `local-endpoint` (Free mode against a fake OpenAI-compatible server in `fixtures/fake-openai-server.mjs`; runs with `test:mock`), `free-mode`, `pro-mode` (placeholder) |
| `packages/wireframes` | | Standalone Next app with the reference UX. Not in the root workspaces; install it separately. |

Other folders: `report/` (LaTeX benchmark study), `specs/001-we-need-to/` (original spec and task list), `.specify/` (constitution), `infra/terraform/` (Firebase and App Hosting), `.github/workflows/` (CI, deploy, eval).

## Request flow today (Free mode)

Everything happens in the browser. The server only serves pages.

1. The user enters provider keys on `/config`. `store/slices/apiKeySlice.ts` encrypts them with AES-GCM through `shared-utils/security` and Zustand persists them to localStorage (`ensemble-ai-store`). The same page adds OpenAI-compatible endpoints (Ollama, LM Studio, llama.cpp, vLLM, OpenRouter, Groq, Together or a custom URL), kept in `store/slices/endpointsSlice.ts` with their optional keys encrypted the same way. Each endpoint is checked with `GET {baseURL}/models` when added or edited. One valid key or one connected endpoint is enough to continue, so a user with only Ollama needs no cloud key.
2. On `/ensemble` the user picks models and a summarizer. Model lists come from `lib/models.ts` (hard-coded fallback) merged with live lists from `lib/providerModels.ts`, fetched only for providers with a valid key. Models of connected endpoints are read live from each server (`lib/endpointModels.ts`) and shown as `llama3.2:3b (Ollama)`. The sidebar saves the selection under a name (`ensembleSlice.saveEnsemble`; the same name replaces the earlier one), lists saved ensembles, and loads or deletes them. A saved ensemble keeps its models, summarizer, consensus method and ELO top N, and is persisted with the store. The curated `PRESETS` in `ensemble/page.constants.ts` are not shown yet.
3. On `/prompt` the user writes the prompt, can add manual answers (pasted from another tool), and picks a consensus method (`standard | elo | majority | council`, `store/slices/ensembleSlice.ts`). Before submitting, the page shows the number of model calls and an estimated cost range (`hooks/useRunEstimate.ts`, see Pricing below).
4. On `/review`:
   - `review/hooks/useStreamingResponses.ts` gets a client from `ProviderRegistry` and calls `streamResponse` for each model. Chunks are flushed to the store every 100 ms.
   - A failed model does not fail the run. Clients report a `ProviderError` with a kind (`invalid_key`, `missing_key`, `rate_limited` with the provider's retry delay, `timeout`, `provider_unavailable`, `other`), stored on the answer. Its card explains the error and offers a retry for that model only (`ResponseErrorNotice`). Agreement and consensus use the answers that succeeded, and `RunExclusionNote` names the models left out, or explains that consensus needs at least 2 answers. A retry clears the consensus, and drops the result of a consensus still running, so it runs again with the new answer.
   - The last run is persisted in localStorage (`ensemble-ai-store`) and is shown again after a reload or a later visit to `/review`. Submitting a new prompt clears it (`startRun`). An answer that was still streaming when the page unloaded is loaded as an `interrupted` error with a retry button.
   - `review/hooks/useReviewPageState.ts` picks the embeddings provider with `lib/embeddingsProvider.ts`: the user's override on `/config` when its key is valid, otherwise OpenAI, then Google, then an OpenAI-compatible endpoint with an embedding model (`lib/endpointStatus.ts`). `review/hooks/useResponseEmbeddings.ts` calls `generateEmbeddings` on that provider for each answer. `responseSlice.calculateAgreement` builds the cosine similarity matrix with `shared-utils/similarity`, and `lib/agreement.ts` turns it into pairwise comparisons, matched to answers by the embeddings' model ids so a failed embedding leaves that answer out (the page lists it) rather than blanking the score. Stored embeddings carry the provider that produced them, so a reload reuses them instead of calling the provider again. With no OpenAI or Google key and no endpoint embedding model, the page shows a message instead of a score. Manual answers are embedded and scored with the model answers (`useReviewAnalytics` returns them as `agreementAnswers`). A manual answer can also be added on `/review`, during or after the run; that clears the consensus so it runs again over every answer (`review/hooks/useAddManualAnswer.ts`). New comparison and Start over drop the manual answers with the run (`review/hooks/useReviewNavigation.ts`), so they never reach the next prompt's consensus or agreement score.
   - `review/hooks/useConsensusGeneration.ts` runs the chosen consensus strategy with the summarizer model. Each provider it hands to a strategy is wrapped with `withUsageTracking`, which records the tokens of every consensus call in `responseSlice.consensusUsage`.
   - Majority runs call `MajorityVotingConsensus.runConsensus`. One structured call to the summarizer (`generateStructured`) extracts each answer's short final answer (number, option letter, yes/no or short phrase). The answers are normalised (number formats, case, punctuation, option letters) and counted. A single winner with at least 2 votes becomes the consensus text (a numeric winner as its canonical value, so `1/2` gives `0.5`) and no other call is made. On a tie, when fewer than half the answers are short, or when extraction fails, the strategy falls back to the LLM method (ranking call, then synthesis). The outcome is stored in `responseSlice.majorityVote` and shown by the `MajorityVoteBreakdown` molecule under the consensus card: each answer with its votes and models, the winner or tie, and why the fallback ran.
   - Once every answer has finished, the page shows the cost of the run (`hooks/useRunCost.ts`): answers, consensus calls and embedding calls priced with the shared table. It updates as consensus calls finish.

Embeddings: OpenAI uses `text-embedding-3-small` and Google uses `gemini-embedding-2`. OpenAI-compatible endpoints use the embedding model set on the endpoint (for example `nomic-embed-text` on Ollama) through `requestOpenAICompatibleEmbedding`. The other providers have no embeddings API and throw `EmbeddingsNotSupportedError`; nothing falls back to fake vectors outside mock mode. Mock mode keeps the mock client's deterministic hash vectors.

## Pricing

`packages/shared-utils/src/pricing/` (import `@ensemble-ai/shared-utils/pricing`):

- `priceTable.ts` is generated by `npm run prices:refresh --workspace=packages/shared-utils`, which reads the public OpenRouter model lists (`/api/v1/models` and `/api/v1/embeddings/models`, no key) and maps OpenRouter ids to our provider and model ids (`x-ai` becomes `xai`, Anthropic `claude-opus-5.5` becomes `claude-opus-5-5`, `:batch` and `:free` variants are dropped). Prices are USD per million input and output tokens.
- `getModelPrice(provider, modelId)` returns `{ status: 'unknown' }` for a model with no entry. For `openai-compatible` it calls `getEndpointModelPrice` (`endpointPrices.ts`), which reads the preset from the endpoint id in the model id: local presets (Ollama, LM Studio, llama.cpp, vLLM) cost 0 and are marked `local`; OpenRouter, Groq and Together models are priced when the table has an entry with the same OpenRouter id (for Groq and Together this is OpenRouter's price for that model); anything else, including Custom endpoints, is unknown. `estimateRun` and `computeRunCost` count local calls in `localCallCount`, and `RunCostSummary` says those calls cost nothing. Nothing guesses a price; the UI lists unpriced models and leaves their calls out of the cost. `estimateRun` and `computeRunCost` count priced and unpriced calls, so `RunCostSummary` shows a lower bound ("at least") when some calls have no price and "unknown" when none has, never $0.00.
- `estimateRun` counts calls per consensus method, matching the strategy packages: standard 1, majority 1 to 3 (the extraction call, plus ranking and synthesis when the vote falls back), ELO `N*(N-1)` judge calls plus 1 summary, council `N*(N-1)` critiques, `N` rebuttals, `N*(N-1)` judgments, up to `N*(N-1)/2` ranking calls and 1 summary (56 for 5 models). ELO and council need 3 answers. Embeddings add one call per answer. The cost range assumes short (200 token) to long (2000 token) answers.
- After a run, `computeRunCost` prices each call. Providers pass input and output tokens to `onComplete` as a fourth `usage` argument when their stream reports them (OpenAI, xAI, DeepSeek, Gemini, Anthropic, Perplexity), and return them as `usage` from `generateStructured`. Hidden reasoning tokens count as output: xAI leaves them out of `completion_tokens`, so output is taken as `total_tokens - prompt_tokens` when that is larger. When a provider reports none, tokens are estimated from text length (4 characters per token) and the cost is labelled estimated. Embedding calls are always estimated.

## Providers

- Interface: `AIProvider` in `shared-utils/src/providers/types.ts` (`streamResponse`, `generateEmbeddings`, `validateApiKey`, `listAvailableModels`, `listAvailableTextModels`, `generateStructured`).
- `ProviderName`: `openai | anthropic | google | xai | deepseek | perplexity | openai-compatible`. `ProviderMode`: `mock | free | pro`. The same union is in `consensus-core/src/types.ts`.
- Clients live in `shared-utils/src/providers/clients/<provider>/`. All extend `base/BaseFreeClient.ts` (key check, stream timeout of 120 s by default, configurable per call with `timeoutMs`, and error classification through `errors/providerError.ts`).
  - OpenAI, xAI and DeepSeek use the `openai` SDK; the last two set a fixed `baseURL`.
  - Anthropic uses `@anthropic-ai/sdk`. Google uses `@google/generative-ai` plus axios.
  - `openai-compatible` uses `fetch` (see the next section).
  - Perplexity calls the Agent API (`POST https://api.perplexity.ai/v1/agent`) with `fetch`, because Sonar Chat Completions ended on 2026-09-27. Its model ids (`perplexity-fast`, `perplexity-low`, `perplexity-medium`) are Agent API effort presets. Old `sonar*` ids still map to a preset. Key validation uses the free `GET /v1/models`.
  - The SDK clients set `dangerouslyAllowBrowser: true`.
  - Per-model request rules: Anthropic models from Opus 4.7 on (including all 5.x models) get no `temperature`, and structured output uses `output_config.format` instead of a forced `tool_choice`, which Opus 5.5 and Sonnet 5.5 reject (`clients/anthropic/anthropicModelRules.ts`). OpenAI models whose default reasoning effort is above `none` (o-series, `gpt-5`, GPT-5.5 and later, GPT-6) get no `temperature`; base `gpt-5.1` and `gpt-5.2` default to `none` and keep it (`clients/openai/openAIModelRules.ts`).
- `factories/createProviderClient.ts` switches on provider and mode. `pro` throws "not yet implemented". `openai-compatible` in Free mode needs a `getEndpoints` callback instead of `getApiKey`.
- `registry/ProviderRegistry.ts` is a singleton keyed by provider and mode. The app registers clients in `app/src/providers/index.ts`.

### OpenAI-compatible endpoints

Design, as built for M2:

- One provider name, `openai-compatible`, covers every endpoint. Several endpoints can be configured at once. Each model id is qualified with its endpoint id, `${endpointId}/${modelId}` (`ollama/llama3.2:3b`, `openrouter/meta-llama/llama-3.1-8b-instruct`), and parsed on the first slash. So selections, saved ensembles, consensus, persistence and pricing keep working on `(provider, model)` pairs with no new field.
- Endpoint ids are the preset id, then `${presetId}-2` and so on (`clients/openaiCompatible/endpointPresets.ts`), so the preset, and whether the endpoint is local, can be read back from any model id. Presets: Ollama `http://localhost:11434/v1`, LM Studio `http://localhost:1234/v1`, llama.cpp server `http://localhost:8080/v1`, vLLM `http://localhost:8000/v1`, OpenRouter `https://openrouter.ai/api/v1`, Groq `https://api.groq.com/openai/v1`, Together `https://api.together.ai/v1`, and Custom (base URLs checked against each project's docs in November 2026).
- `FreeOpenAICompatibleClient` talks to one server with `fetch`, so no Authorization header is sent when the key is empty and no SDK headers trip a local server's CORS rules. It lists every model from `GET {baseURL}/models` unfiltered, streams chat completions with `stream_options.include_usage` for usage, embeds through `requestOpenAICompatibleEmbedding`, and classifies errors with `classifyProviderError`. `generateStructured` tries `response_format: json_schema`, then `json_object` (schema in the prompt), then plain text, and extracts the JSON object from the reply (bare, fenced or embedded in prose). A 400, 422 or 501, or a reply that is not JSON, moves to the next format; key, rate limit and server errors do not.
- `OpenAICompatibleEndpointsClient` is the registered `openai-compatible` client. It reads the connected endpoints from the store at call time and routes each call to the endpoint named in the model id. Embeddings use the first connected endpoint with an embedding model.
- Store: `endpointsSlice` keeps `{ id, presetId, label, baseURL, apiKey, encryptedApiKey, embeddingModel, status, error, modelCount }`. Only `encryptedApiKey` is persisted (`sanitizeEndpointsForPersist`); the root layout decrypts it with `initializeEndpointKeys`. `apiKeys` stays keyed by the six key providers (`ApiKeyProvider`).
- UI: the `EndpointConfiguration` organism on `/config` (one add button per preset, one `EndpointInput` per endpoint with base URL, optional key, embedding model, status and a Local badge), the `EndpointLogo` atom for preset logos, a server icon for the provider in `ProviderLogo`, and family logos (Meta, Qwen, Gemma, Mistral and others) in `ModelLogo`. Strings are in the component library's EN and FR locale files.
- Mock mode: the mock client has three `ollama/...` models. In mock mode every endpoint connects without a request and offers those models under its own id.
- The server (`providerService.ts`, `routers/provider.ts`) does not serve endpoints; they are configured in the browser only.

Adding another hosted OpenAI-compatible service is one entry in `ENDPOINT_PRESETS`, an icon in `EndpointLogo.tsx`, and, if the price table can price it, an entry in `PRICED_BY_OPENROUTER_ID`.

Adding a provider with its own API and key touches about 20 files: shared-utils `types.ts`, `createProviderClient.ts` and `MockProviderClient.ts`; `consensus-core/src/types.ts`; app `providers/index.ts`, `ensemble/page.constants.ts`, `config/hooks/useConfigPage.ts`, `store/slices/apiKeySlice.ts`, `ensembleSlice.ts` (`ProviderType`), `store/index.ts`, `lib/models.ts`, `lib/modelModalities.ts`, `lib/providerStatus.ts`, `review/hooks/useConsensusGeneration.ts`, server `providerService.ts` and `routers/provider.ts`; component-library `ProviderLogo.tsx`, `ModelLogo.tsx`, `ModelSelectionList.tsx` (provider groups), `ResponseCard.tsx` (`PROVIDER_NAMES`), and the i18n JSON files. A provider with embeddings also touches `selectEmbeddingsProvider.ts` and `EmbeddingsProviderSelector.tsx`.

## Server today

- tRPC 11 at `/api/trpc/[trpc]`. Routers in `app/src/server/api/routers/`:
  - `auth` (`me`)
  - `provider` (`listTextModels`, `streamText`, `streamTextEvents`), using server keys from `src/env.js` through `server/providers/providerService.ts`. `streamText` buffers the whole answer. Cancellation is a no-op.
  - `post` (leftover T3 demo).
- `protectedProcedure` verifies a Firebase ID token with Firebase Admin (`server/auth/firebaseAdmin.ts`). The client has no sign-in code yet, and no UI calls any tRPC procedure.
- Sentry is configured (`sentry.*.config.ts`). No database. No Stripe.

## Hosting today

- Firebase App Hosting, backend `ensemble-app` (`firebase.json`), configured by `apphosting.yaml`: 1 vCPU, 1 GiB, `minInstances: 0`, `maxInstances: 3`. With a minimum of 0 nothing is billed while idle; the first request after a quiet spell pays a cold start.
- `infra/terraform/` creates the Firebase project, App Hosting backend (id `ensemble-app`, matching `firebase.json`), APIs, IAM and GitHub Workload Identity.
- `.github/workflows/deploy.yml` deploys on push to `main`, then runs a free HTTP smoke check of the deployed URL and one Google-only E2E test (when `TEST_GOOGLE_API_KEY` is set). The full `free-mode` suite runs only on a manual dispatch with `full_e2e`.
- `.github/workflows/eval-ci.yml` (paid evals) runs only on manual dispatch or on PRs labelled `run-eval`.

## Eval harness

- Datasets load from Hugging Face in `eval/src/lib/benchmarkDatasetLoaders.ts`: gsm8k, math500, truthfulqa, gpqa, mmlu_pro, simpleqa, hle, arc, hellaswag.
- Models are given as `provider:model`. Defaults are in `eval/src/lib/evalDefaults.ts`: `google:gemini-3-flash-preview`, which matches the committed caches in `eval/.cache/`.
- Scoring uses an LLM judge through `generateStructured` (`eval/src/lib/evaluators.ts`), with a regex fallback for numbers.
- Concurrency: AIMD limiter in `eval/src/lib/concurrencyPool.ts`.
- Cost per answer comes from the shared price table, using reported token usage or a text-length estimate (`costFromTextLength`). Consensus calls are not priced yet.
- Known issues, all addressed in M3: TruthfulQA options are not shuffled; failed questions are dropped instead of counted wrong; the same model often generates, merges and judges; `report/` data is not in the repo.

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
| Real `generateEmbeddings` for OpenAI and Google (done); one similarity implementation in shared-utils (done); OpenAI-compatible embeddings through `requestOpenAICompatibleEmbedding` (done) | M1, M2 |
| Pricing table in shared-utils, used for estimates and actual cost (done) | M1 |
| `FreeOpenAICompatibleClient` with configurable base URL and optional key, several endpoints with presets (done) | M2 |
| Eval harness accepts the OpenAI-compatible provider; methodology fixes | M3 |
| Single workspace route replacing the four wizard pages; history in IndexedDB | M4 |
| Client Firebase Auth, `ProAPIClient` over `streamTextEvents`, Firestore, credit ledger, Stripe routes | M5 |
| Shares with Firestore TTL, synced history | M6 |
| `apphosting.yaml`: `minInstances: 0`, `maxInstances: 3`, 1 GiB | M0 |
