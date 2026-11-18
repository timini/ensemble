# Ensemble AI: Roadmap

Last updated: 2026-11-15. Read [PRODUCT_VISION.md](./PRODUCT_VISION.md) first.

This plan takes Ensemble from its state in February 2026 (last commit `d6194e7`) to a product people can use: every existing feature finished, Pro mode with sign-in and Stripe working, a better UI, local model support, credible benchmarks, and hosting that costs close to nothing when idle.

It replaces the Phase 4 task list in `specs/001-we-need-to/tasks.md` (T235 onward). Where this roadmap and that task list disagree, this roadmap wins. See "Decisions" below for why.

Estimates are rough, for one developer working with coding agents.

## Where we are

What works:

- Free mode: the user enters provider keys, picks 2 to 6 models, writes a prompt and gets streamed answers from 6 providers, called directly from the browser.
- Four consensus methods (standard, majority, elo, council) as separate packages, wired into the review page.
- Presets, manual responses, EN/FR, dark mode, a 48-component library with Storybook and a large unit test suite.
- An eval harness with 9 datasets, caching, concurrency control and Wilson/Fisher statistics code.
- Firebase App Hosting deploy, Terraform, Sentry, Firebase Admin token checks on tRPC.

What is broken or unfinished:

| Problem | Where | Impact |
|---|---|---|
| Agreement scores use fake vectors built from a text hash | `shared-utils/.../BaseFreeClient.ts:116`, `MockProviderClient.ts:97` | The product's core signal is meaningless today |
| Pro mode throws "not yet implemented" | `shared-utils/.../createProviderClient.ts` | No way to use the app without provider keys |
| No client sign-in, no Stripe, no database | `packages/app` | Auth and billing exist only in specs |
| tRPC provider router built but never called; `streamText` buffers instead of streaming | `app/src/server/api/routers/provider.ts`, `server/providers/providerService.ts:62` | Server path untested in real use |
| Share button does nothing | `ConsensusCard` `onShare` is never passed in the app | Visible dead feature |
| Results wiped on each visit to `/review`, no history | inline script in `app/src/app/layout.tsx` | Users lose their work |
| `/` redirects to a form asking for up to 6 API keys | `app/src/app/page.tsx` | Most visitors leave before seeing anything |
| Model lists and presets reference retired models (Claude 3 Opus, GPT-4o, o1-preview) | `app/src/lib/models.ts`, preset definitions | First impression looks stale |
| Cost tracking reads mock prices | `BaseFreeClient.listAvailableModels`, `eval/src/lib/ensembleRunner.ts:22` | Users and benchmarks can't see real cost |
| `apphosting.yaml` keeps 1 instance always on (1 vCPU, 2 GiB) | `apphosting.yaml` | Pays for an idle server around the clock |
| Eval CI runs paid models on PRs; post-deploy E2E calls real providers on every merge to main | `.github/workflows/eval-ci.yml`, `deploy.yml` | Recurring spend with little value |
| TruthfulQA options never shuffled (correct answer always A) | `eval/src/lib/benchmarkDatasetLoaders.ts:96` | The only "ensemble wins" result is suspect |
| Report data missing from the repo | `report/generate_figures.py` reads `artifacts/eval/issue-114/` | Results can't be reproduced |
| Terraform backend id `ai-ensemble` does not match `firebase.json` `ensemble-app` | `infra/terraform/app-hosting.tf` | Infra drift |

## Decisions

These settle questions the old spec left open or answered differently.

1. **Stay on Firebase. Do not move to Vercel, Prisma or NextAuth.** The code already uses Firebase Admin auth, App Hosting and Terraform. Firebase Auth is free at our scale. Firestore has a free daily quota and needs no always-on database. A Postgres instance would add a fixed monthly cost. Vercel's free Hobby plan does not allow commercial use, which rules it out once Stripe is live.
2. **Scale to zero.** App Hosting runs on Cloud Run. Set `minInstances: 0`, `maxInstances: 3`, 1 GiB memory. The cost is a cold start of a few seconds on the first request after idle. Free mode runs in the browser, so the server mostly serves static pages and the Pro API.
3. **Firestore is the database.** Collections: `users`, `creditLedger`, `usage`, `presets`, `history`, `shares`. Shares use a Firestore TTL policy for the 30-day expiry, so no cleanup job is needed.
4. **Credits are a ledger, not a balance field.** Every purchase and every run writes an immutable ledger entry. The balance is computed and cached on the user document inside a transaction. Stripe webhooks are idempotent on the Checkout Session id.
5. **Stripe Checkout for one-off credit packs.** No subscriptions at launch. Stripe hosts the payment page and sends receipts, which covers the spec's email receipt requirement (FR-046) with no email service of our own. Minimum pack of $5, so card fees stay a small share.
6. **Pro mode routes model calls through OpenRouter by default.** One server key, one bill, every major model, and an API that publishes per-model prices we can use for credit pricing. Direct provider keys stay possible on the server for models OpenRouter lacks. This is the cheapest option to run and keeps the Pro provider list in sync with Free mode.
7. **One OpenAI-compatible provider covers local and open models.** A configurable base URL and an optional key. It covers Ollama, LM Studio, llama.cpp, vLLM, OpenRouter, Groq and Together without a client per vendor.
8. **Redesign follows the existing flow: wireframes, then components, then app.** The wireframes package stays the UX source of truth and is updated first.
9. **Benchmarks run on cheap open models.** Premium models only appear as a single reference point, run once and cached.

## Target monthly running cost

| Item | Idle | At about 1,000 runs a month |
|---|---|---|
| App Hosting / Cloud Run (scale to zero) | about $0 | a few dollars, mostly inside Cloud Run's free monthly allowance |
| Firestore | $0 (free daily quota) | $0 to $1 |
| Firebase Auth | $0 | $0 |
| Secret Manager, Artifact Registry, Cloud Build | under $1 | under $2 |
| Stripe | $0 fixed | per-transaction card fees only, recovered by credit pricing |
| Model calls in Pro mode | $0 | paid by user credits with a margin |
| CI and benchmarks | $0 by default | a few dollars per manual benchmark run on open models |

Set a Google Cloud budget alert at $10 a month in M0. Treat these numbers as targets to check against the first real bills, not as quotes.

## Milestones

Each milestone ends with something a user can see or with a number we can trust. Milestones M2 and M3 can run in parallel after M1.

### M0: Foundation and cost control (about 3 days)

Goal: the repo installs, builds and deploys cleanly, and nothing costs money while idle.

- [x] `npm install && npm run build && npm test` pass from a clean checkout. Fix anything that has rotted since February.
- [x] Check whether the February deploy is still live. Set `minInstances: 0`, `maxInstances: 3`, `memoryMiB: 1024` in `apphosting.yaml`. Add a $10 budget alert. (Live service scaled to zero on 2026-11-16. The budget alert is still to do; it needs owner approval for the billing change.)
- [x] Fix the Terraform backend id mismatch so `terraform plan` matches what is deployed. (Code fixed. `terraform plan` has not been run against remote state; it may need a `terraform import` first.)
- [x] Make `eval-ci.yml` manual or label-triggered only. Point post-deploy E2E at mock mode plus one cheap smoke call.
- [x] Hide `/test-components` in production builds. Remove the T3 `post` router demo.
- [x] Refresh the fallback model list and default presets to current models.
- [x] Align eval defaults and `eval:ci:*` scripts with the committed caches (`gemini-3-flash-preview`), or regenerate the caches, so CI stops making live calls. (Done. The committed `baselines/quick-eval.json` still records `gemini-2.5-flash-lite`, so the regression gate skips with a warning until one paid manual baseline run is committed.)
- [x] Add `@anthropic-ai/sdk` and `@google/generative-ai` to `shared-utils` dependencies and align its `openai` version (`^4`) with the app (`^6`).
- [x] Fix stale story ids in `component-library/scripts/screenshot-stories.ts`. Add the missing stories and tests for Dialog, Markdown and PromptCard.
- [x] Merge the duplicated token definitions in the app and component-library `globals.css`.
- [x] Fix code comments in `store/index.ts` and `responseSlice.ts` that say responses are not persisted.
- [x] Docs match the code (this document set).

Done when: a clean clone builds, CI is green, and the idle bill is near zero.

### M1: Make the core features truthful (about 1.5 weeks)

Goal: everything the UI shows is real.

- [x] Real embeddings: implement `generateEmbeddings` for OpenAI, Google and the OpenAI-compatible provider. Pick the embedding provider automatically from the user's keys, with a setting to override it. Remove the hash fallback outside mock mode. If no embedding provider is available, say so in the UI instead of showing a score. (OpenAI and Google done. The OpenAI-compatible provider reuses `requestOpenAICompatibleEmbedding` in M2.)
- [x] Merge the three cosine similarity implementations (`app/src/store/slices/responseSlice.ts`, `shared-utils/src/similarity`, `component-library/src/lib/similarity.ts`) into the shared-utils one.
- [x] Real pricing: a pricing table in `shared-utils`, refreshed by a script (the OpenRouter models API publishes prices). Use it for the cost estimate before a run and the actual cost after it.
- [x] Before each run, show the number of model calls and estimated cost for the selected consensus method (for example: council with 5 models is 56 extra calls).
- [x] Majority consensus: add a mechanical vote for short answers (number, letter, yes/no) using structured output, and fall back to the LLM method for long answers.
- [x] Error handling per model card: invalid key, rate limit, timeout, provider down. One failed model must not fail the run.
- [x] Remove the localStorage wipe on `/review` and keep the last run. Full history comes in M4.
- [x] Perplexity: Sonar chat completions ended on 2026-09-27. Move `FreePerplexityClient` to the current Sonar or Agent API for validation and streaming.
- [x] Anthropic: Claude 5.5 models reject a forced `tool_choice` and non-default `temperature`. Use `tool_choice: auto` with a strict tool (or structured output) and drop `temperature`, so majority, ELO and council work with Anthropic keys.
- [x] Finish the open Free-mode test tasks from the old list: presets (T178), manual response (T179), agreement for 2 to 6 responses (T180), error scenarios (T226).

Done when: the agreement score changes when answers change in meaning, and a user sees the cost before and after every run.

### M2: Local and open models (about 1 week)

Goal: Ensemble works with no cloud keys at all.

- [x] `FreeOpenAICompatibleClient` in `shared-utils` (clone of `FreeDeepSeekClient`): configurable base URL, optional key, unfiltered model list, embeddings via `/v1/embeddings`.
- [x] Add it to the `ProviderName` unions, the factory, the store, the config UI, logos and i18n (about 16 files, listed in [ARCHITECTURE.md](./ARCHITECTURE.md)).
- [x] Presets in settings for Ollama (`http://localhost:11434/v1`), LM Studio (`:1234/v1`), llama.cpp, vLLM, OpenRouter, Groq and Together. Several endpoints can be configured at once.
- [x] Detect a running Ollama automatically and offer it on first run.
- [x] Spike: can the hosted HTTPS site call `http://localhost` in Chrome, Safari and Firefox, given CORS (`OLLAMA_ORIGINS`) and Chrome's local network access permission? Document the result. If it is unreliable, ship a one-command local run (`npx`) for local-model users and say so in the UI.
- [x] Local embeddings: `nomic-embed-text` through Ollama, or an in-browser model if the spike shows it is needed.
- [x] Setup guide in `docs/LOCAL_MODELS.md`.

Done when: a user with only Ollama installed can run a 3-model ensemble with real agreement scores and no API keys.

### M3: Cheap, credible benchmarks (about 1.5 weeks, parallel with M2)

Goal: a reproducible answer to "does an ensemble beat its best member?", for under $20 in total.

- [x] Add the OpenAI-compatible provider to the eval harness (`eval/src/lib/modelSpecs.ts`, `providers.ts`, `types.ts`), with an empty key allowed for local servers.
- [x] Fix the methodology:
  - shuffle multiple-choice options with a fixed seed
  - ask every model for a structured final answer and extract it mechanically, so most datasets need no LLM judge
  - fall back to `json_object` or regex where a server lacks strict JSON schema support
  - count timeouts and errors as wrong instead of dropping them
  - use n of at least 200 per dataset, paired McNemar tests, Wilson intervals in every report (the statistics code exists in `eval/src/lib`)
  - use a different model for judging than for generating, where a judge is still needed
- [x] Fix cost tracking to use the real pricing table from M1.
- [ ] Calibrate the agreement score. Real embedding cosines sit in a narrow band (roughly 0.1 to 0.9 for `text-embedding-3-small`), and the current `(v+1)/2` mapping makes unrelated answers look like moderate agreement. Fit per-embedding-model thresholds from benchmark runs (agree vs disagree pairs) and update the labels.
- [ ] Calibrate the token assumptions in `estimateRun` from recorded usage, including hidden reasoning tokens.
- [ ] Benchmark matrix on GSM8K, MMLU-Pro, GPQA and TruthfulQA (shuffled), all through OpenRouter or local Ollama:
  - three open 7B to 14B models from different families (for example Qwen, Llama, Gemma), each alone
  - the same three as an ensemble, with mechanical majority and standard consensus
  - one premium model as a reference, run once and cached
- [ ] Commit raw results under `packages/eval/results/` so `report/generate_figures.py` can be re-run. Regenerate the report.
- [ ] Publish a results page in the app (page built at `/benchmarks` with an honest not-run state; real numbers come from the paid run) (`/about` or `/benchmarks`) with the numbers and their confidence intervals.

Done when: the results page shows the comparison with confidence intervals, and anyone can reproduce it with one command. The landing page copy is then set from these results, as the vision document requires.

### M4: UI and UX redesign (about 3 weeks)

Goal: a first-time visitor understands the product and gets an answer in under a minute.

Order of work: update the wireframes, then build or adapt components in Storybook, then wire the app.

- [x] **Landing page at `/`**, replacing the redirect. One sentence explaining the product, a recorded example run (real answers, agreement score and consensus, no keys needed), and three ways in: "Use your own keys", "Use local models", "Sign in for Pro".
- [x] **One workspace screen** replacing the four-step wizard:
  - Composer at the top, with model chips (the ensemble picker inline) and the consensus method as a dropdown that shows calls and cost.
  - Answers stream into columns on desktop and swipeable tabs on mobile.
  - The agreement panel and the consensus answer sit above the individual answers.
  - Manual response and summarizer choice are reachable from the composer.
  - The old `/config`, `/ensemble`, `/prompt` and `/review` routes redirect into the workspace with the right panel open, so existing links and E2E tests keep working during the change.
- [x] **Onboarding sheet** on first run: choose keys, local or Pro. Validate a key inline. One key is enough to start (OpenRouter gives access to every provider with one key).
- [x] **Settings sheet**: keys, local endpoints, embedding provider, theme, language. Replaces the config page.
- [x] **History sidebar**: past runs stored in IndexedDB in Free mode, with search and delete. Presets live in the same sidebar.
- [x] **Visual refresh**: a distinct look (type scale, colour, spacing tokens) applied through the existing token system in `component-library/src/styles/globals.css`. Keep dark mode.
- [x] **Accessibility and responsive checks** from the old list (T173, T181, T182): WCAG 2.1 AA on every screen at 375, 768 and 1440 px.
- [x] Update `/features` and `/about` to match the vision's claims rule.
- [x] Translations (EN, FR) for every new string.

Done when: an untrained tester reaches a first answer in under 60 seconds, measured on five people (simulated with five scripted Playwright personas on 2026-11-18; a session with real people is still to do), and E2E mock tests pass on the new flow.

### M5: Auth, Pro mode and Stripe (about 3 weeks)

Goal: a user can sign in, buy credits and run ensembles with no provider keys.

Auth:
- [x] Firebase Auth on the client (Google and email link). Pass the ID token to tRPC. The server already verifies it (`app/src/server/auth/firebaseAdmin.ts`, `protectedProcedure`).
- [x] Account menu in the header. Sign-in is only required for Pro, sharing and synced history.

Server streaming:
- [x] `ProAPIClient` implementing `AIProvider` over the existing `streamTextEvents` tRPC subscription (SSE). Remove the buffered `streamText` path or make it stream.
- [x] Wire `mode === 'pro'` in `createProviderClient` and the registry.
- [x] Route calls through OpenRouter with the server key (Decision 6). Consensus and embeddings run server-side in Pro so they are billed too.
- [x] Real cancellation (the current cancel is a no-op).

Credits and billing:
- [x] Firestore data model and security rules (users, creditLedger, usage). Server writes only.
- [x] Credit service: estimate before the run, reserve credits, settle with actual tokens after, refund on failure. Block submission when the balance is too low (FR-036) and warn under a threshold (FR-038).
- [x] Stripe Checkout session route and webhook route (`/api/stripe/checkout`, `/api/stripe/webhook`), with signature verification and idempotency. Credit packs defined in config.
- [x] Usage dashboard (`/account`): balance, purchases, usage by model, recent runs (FR-041).
- [x] Abuse controls: per-user rate limit, a maximum token budget per run, Firebase App Check, and a hard monthly spend cap on the OpenRouter key.
- [x] Switching between Free and Pro keeps presets and history (FR-030).

Tests:
- [x] Unit and integration tests for the credit service and webhook (Stripe test mode, Firestore emulator).
- [x] E2E `pro-mode` suite: sign in, buy credits in test mode, run, check the deduction (replaces T297, T298).

Done when (code complete and tested against the Firebase emulators and Stripe test signatures on 2026-11-18; the live check needs the owner to create the secrets in docs/DEPLOYMENT.md and switch Stripe to live keys): in production with Stripe live keys, a new user signs in, buys the smallest pack, runs an ensemble, and sees the deduction on the dashboard.

### M6: Sharing, sync and launch (about 1.5 weeks)

- [x] Share: `shares` collection with a 30-day TTL, a public read-only page at `/s/[id]` showing the prompt, models, answers, agreement and consensus (FR-042 to FR-044). Available to signed-in users in both Free and Pro, since a share is just a stored result.
- [x] Synced history and presets for signed-in users.
- [ ] Custom domain, Open Graph images for shared links, basic SEO on the landing page. (Open Graph, SEO, sitemap and robots done; the domain is an owner step in docs/DEPLOYMENT.md.)
- [ ] Production checklist (Lighthouse 94 to 96 performance and 100 accessibility locally; security review in docs/security-review-m6.md; Sentry scrubbing and an uptime check and budget alert in terraform; owner still applies them): Sentry alerts, uptime check, Lighthouse 90+ performance and 100 accessibility on the landing page (T331, T332), security review of key handling and the webhook.
- [x] `docs/DEPLOYMENT.md` with the full production setup.
- [ ] Update the devblog post with the new product and benchmark results. (Draft in docs/launch/devblog-post.md; benchmark section pending.)

Done when: the product is live on its own domain, a shared link opens for a logged-out visitor, and the launch checklist is complete.

## Timeline summary

| Milestone | Length | Depends on |
|---|---|---|
| M0 Foundation and cost control | about 3 days | none |
| M1 Truthful core | about 1.5 weeks | M0 |
| M2 Local models | about 1 week | M1 (embeddings, pricing) |
| M3 Benchmarks | about 1.5 weeks | M1; runs alongside M2 |
| M4 UX redesign | about 3 weeks | M1; best after M3 so copy can use results |
| M5 Auth, Pro, Stripe | about 3 weeks | M4 (account UI lives in the new layout) |
| M6 Sharing and launch | about 1.5 weeks | M5 |

Roughly 12 to 14 weeks in total for one developer.

## Open questions for the owner

1. Credit pricing: what margin over model cost, and what pack sizes ($5, $20, $50)?
2. Which sign-in methods: Google and email link only, or GitHub too?
3. Domain name for launch.
4. Stripe account country, which decides tax handling (Stripe Tax or manual).
5. Is OpenRouter acceptable as the Pro upstream (Decision 6), or should Pro call providers directly?
