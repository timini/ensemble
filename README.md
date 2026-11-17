# Ensemble AI

Ask several AI models the same question at once, see where they agree and where they don't, and get one answer you can check.

Ensemble sends one prompt to 2 to 6 models in parallel, streams every answer side by side, scores how much they agree, and merges them into a consensus answer using one of four methods. A low agreement score is a warning that no single answer should be trusted.

- Product vision: [docs/PRODUCT_VISION.md](./docs/PRODUCT_VISION.md)
- Roadmap: [docs/ROADMAP.md](./docs/ROADMAP.md)
- Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Benchmark study (February 2026): [report/report.pdf](./report/report.pdf)
- Benchmark method and matrix (M3): [packages/eval/docs/BENCHMARKS.md](./packages/eval/docs/BENCHMARKS.md), shown in the app at `/benchmarks`
- Write-up: https://timini.github.io/devblog/ensemble/

## Status

Free mode works: bring your own keys for OpenAI, Anthropic, Google, xAI, DeepSeek and Perplexity, or point Ensemble at one or more OpenAI-compatible endpoints (Ollama, LM Studio, llama.cpp, vLLM, OpenRouter, Groq, Together or a custom URL). Local endpoints need no key. The browser calls the providers directly and keys are stored encrypted in the browser.

Local models: with only Ollama installed, `npm run local` runs Ensemble on your computer, finds Ollama and runs a 3-model ensemble with real agreement scores and no API keys. This flow is verified end to end against a fake Ollama server in the local-endpoint E2E suite, not yet against a real Ollama install. See [docs/LOCAL_MODELS.md](./docs/LOCAL_MODELS.md) for the setup guide, other servers, recommended models and which browsers let the hosted site reach `localhost`.

Not finished yet (see the roadmap):

- A redesigned single-screen UI with history (M4).
- Pro mode: sign-in, Stripe credits and server-side model calls (M5).
- Shareable result links (M6).

## Quick start

Requires Node 18+ and npm 9+.

```bash
git clone https://github.com/timini/ensemble
cd ensemble
npm install
npm run build --workspace=packages/shared-utils   # the app imports its dist bundle
npm run dev                                        # app in Free mode on http://localhost:3000
```

Open the app, enter at least one provider key or add an OpenAI-compatible endpoint on the config page, pick two or more models and ask a question.

To use the production build with local models, run `npm run local` instead (http://localhost:3000; see [docs/LOCAL_MODELS.md](./docs/LOCAL_MODELS.md)).

Other entry points:

```bash
npm run dev:mock          # app with mock providers (UI work and CI only, never shown to users)
npm run dev:components    # Storybook on http://localhost:6006
cd packages/wireframes && npm install && npm run dev   # reference UX (separate install, not a workspace)
```

## Repository layout

| Path | What it is |
|---|---|
| `packages/app` | Next.js 15 app (App Router, React 19, Tailwind 3.4, Zustand, tRPC 11) |
| `packages/component-library` | 49 UI components with Storybook 9 and Vitest |
| `packages/shared-utils` | Provider clients, registry, similarity maths, Web Crypto helpers |
| `packages/consensus-*` | The four consensus methods: standard, majority, elo, council, plus shared types in `consensus-core` |
| `packages/eval` | Benchmark CLI for comparing ensembles with single models |
| `packages/eval-baseline` | Python lm-eval baseline runner |
| `packages/e2e` | Playwright suites (mock, free, pro placeholder) |
| `packages/wireframes` | Reference UX, the source of truth for page design |
| `infra/terraform` | Firebase project and App Hosting backend |
| `report` | LaTeX source and figures for the benchmark study |
| `specs/001-we-need-to` | Original spec and task list (Phase 4 superseded by the roadmap) |

Package details are in each package's README.

## Consensus methods

| Method | How it works | Extra model calls for 5 models |
|---|---|---|
| Standard | One summarizer model merges all answers | 1 |
| Majority | Counts votes on short final answers (number, letter, yes/no, short phrase); for long or tied answers a model ranks answers by alignment, then merges | 1 to 3 |
| ELO | Every pair is judged in both orders, answers are ranked, the top 3 are merged | 21 |
| Council | Models critique each other, rebut, vote, then a summary is written | 56 |

## Commands

Run from the repo root.

```bash
npm run build       # build every workspace in dependency order
npm test            # unit tests in every workspace
npm run lint
npm run typecheck
npm run analyze:fta # static complexity check
```

### End-to-end tests

```bash
npm run test:mock --workspace=packages/e2e   # mock providers, plus Free mode against a fake Ollama; no keys (CI default)
npm run test:free --workspace=packages/e2e   # real providers, needs TEST_*_API_KEY variables
npm run test:ui --workspace=packages/e2e     # Playwright UI for debugging
E2E_BASE_URL=https://<deployed-url> npm run test:free --workspace=packages/e2e   # against a deployment
```

Free-mode E2E tests read `TEST_OPENAI_API_KEY`, `TEST_ANTHROPIC_API_KEY`, `TEST_GOOGLE_API_KEY`, `TEST_XAI_API_KEY` and similar from `.env.local` at the repo root (gitignored).

### Benchmarks

```bash
GOOGLE_API_KEY=... node --import tsx packages/eval/bin/ensemble-eval.mjs quick-eval
```

The M3 benchmark matrix (three open models alone and as an ensemble, against a premium reference, on GSM8K, MMLU-Pro, GPQA and TruthfulQA) is one command. It prints a cost estimate and spends only with `--yes`:

```bash
npm run bench:matrix --workspace=packages/eval                 # estimate only
npm run bench:matrix:dry-run --workspace=packages/eval         # whole pipeline with the mock provider
OPENROUTER_API_KEY=... npm run bench:matrix --workspace=packages/eval -- --yes --publish
```

The method, results format, calibration scripts and how to regenerate the report are in [packages/eval/docs/BENCHMARKS.md](./packages/eval/docs/BENCHMARKS.md). No paid run has been made yet, so `/benchmarks` says the benchmarks have not been run. The rest of the eval CLI is described in [packages/eval/docs/architecture.md](./packages/eval/docs/architecture.md).

## Deployment

Firebase App Hosting, configured by `apphosting.yaml` and `firebase.json`, with infrastructure in `infra/terraform`. `.github/workflows/deploy.yml` deploys on every push to `main`. The roadmap (M0) moves hosting to scale-to-zero so it costs close to nothing when idle.

## Contributing

- Work on a branch and open a pull request. CI must pass.
- Follow the test-first workflow in [CLAUDE.md](./CLAUDE.md) and [AGENTS.md](./AGENTS.md).
- Use Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`).
- Never bypass the Husky hooks with `--no-verify`.
- UI text goes through i18n keys (English and French). Colours come from the semantic tokens in `packages/component-library/src/styles/tokens.css`.

## License

Private project. All rights reserved.
