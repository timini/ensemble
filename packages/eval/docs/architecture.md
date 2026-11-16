# Eval Pipeline Architecture

## Overview

The eval pipeline asks whether ensemble consensus strategies beat a single model. For each benchmark question it runs the model once (the single baseline), runs the same model N times as an ensemble, combines the N answers with each consensus strategy, and scores everything against ground truth.

The ensemble is the same model sampled N times at a non-zero temperature, not a mix of different providers.

```
                    ┌─────────────┐
                    │  quick-eval │   CLI entry point
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ Dataset1 │ │ Dataset2 │ │ DatasetN │  up to 10 datasets,
         └────┬─────┘ └────┬─────┘ └────┬─────┘  loaded in parallel
              │            │            │
              ▼            ▼            ▼
         ┌──────────────────────────────────┐
         │        Per-dataset runner         │
         │  ┌──────────┐  ┌──────────────┐  │
         │  │ Single 1x │  │ Ensemble Nx  │  │
         │  │ baseline  │  │ + consensus  │  │
         │  └──────────┘  └──────────────┘  │
         └──────────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │   Results and regression check    │
         └──────────────────────────────────┘
```

## Per-question steps

1. **Ensemble generation.** N calls (default 5) to the same model at temperature 0.7. The responses are shared by all strategies. Loaded from `.cache/ensemble/` when a matching cache file exists.
2. **Consensus.** Each selected strategy turns the N responses into one answer using a consensus model (`--consensus-model`). All four strategies are LLM-driven:
   - `standard`: the consensus model summarizes the responses.
   - `elo`: pairwise LLM comparisons produce Elo ratings; the top responses are synthesized.
   - `majority`: the consensus model ranks the responses and synthesizes an answer from the top ones. It is not a mechanical vote count over extracted answers.
   - `council`: extra LLM rounds of critique, rebuttal and judgment.
3. **Evaluation.** Each individual response and each consensus answer is scored with an LLM judge (`--judge-model`) using `generateStructured` (see `src/lib/evaluators.ts`):
   - GSM8K, MATH-500: numeric judge (a regex numeric evaluator exists for when no judge is configured)
   - TruthfulQA, GPQA, MMLU-Pro, ARC, HellaSwag: multiple-choice judge
   - HLE, SimpleQA, HalluMix: exact-match judge

## Caches

`.cache/` is committed so runs can reuse expensive model output.

```
.cache/
├── baselines/   single-model results, key {model}_{dataset}.json
└── ensemble/    raw ensemble responses, key {model}_{dataset}_{N}x_t{temp}.json
datasets/        HuggingFace downloads (gitignored; cached in CI as eval-datasets-v2)
```

What is committed today: baseline and ensemble caches for `google:gemini-3-flash-preview`, 5x at t=0.7, for nine datasets (all except HalluMix).

| Cache | Key | Changes when |
|-------|-----|--------------|
| Baseline | `{model}_{dataset}` | Model changes. Not keyed by sample size; partial hits fall back to a live run |
| Ensemble | `{model}_{dataset}_{N}x_t{temp}` | Model, ensemble size or temperature changes |

When `quick-eval` finds an ensemble cache for the requested model, it loads the full dataset shuffled with seed 42, keeps only the cached question ids, and takes the first `--sample` of them. Every question then hits the cache. Without a matching cache it samples normally and makes live calls.

`--no-cache` (and `--mode mock`) disables cache lookups for that run. It does not delete cache files.

### Model defaults

Defaults live in `src/lib/evalDefaults.ts` and are shared by `quick-eval`, `generate-cache` and the `eval:ci*` scripts (a unit test keeps them in step):

- Model: `google:gemini-3-flash-preview`, the model of the committed caches, so default and CI runs hit them.
- Judge: `google:gemini-2.5-flash`, the judge that scored the committed single-model baseline cache.
- Consensus model: `google:gemini-2.5-flash-lite`. On a cached run the consensus calls (plus judge calls) are the only live calls, so they use the cheapest model.

If the saved baseline file was produced with a different model, ensemble size or sample size, `quick-eval --baseline` skips the regression check, says why, and writes a fresh baseline.

### Generate, then evaluate

`generate-cache` (run rarely, commit the output):

- For each dataset: shuffle with seed 42 (`--seed`), take the first 100 questions (`--sample`), generate N responses per question, save to `.cache/ensemble/`. It also writes the single baseline cache, scored with `--judge-model`.

`quick-eval` (run often):

- Load cached responses, run the consensus strategies, judge, and optionally check for regressions against a baseline file.

## CI

`.github/workflows/eval-ci.yml` runs on pull requests that touch the consensus packages, `shared-utils` or `eval`. A path filter decides which strategies are affected, and each affected strategy runs as its own job with `npm run eval:ci:<strategy>`. The jobs need a Google API key secret. A final `eval-report` job downloads the results and posts a PR comment. A job fails if regressions are detected.

Each job builds the consensus packages, `shared-utils` and `eval`, then runs `quick-eval` with `--baseline baselines/quick-eval.json` and `--question-timeout 300`. Because of the model mismatch above, ensemble responses are generated live in CI.

## Concurrency: AIMD limiter

API calls in a run share one `ConcurrencyLimiter` (`src/lib/concurrencyPool.ts`) using additive increase, multiplicative decrease:

- Start at `--concurrency` (default 40)
- +1 on success, halve on a 429 or when the system monitor reports pressure
- 2 s cooldown between adjustments
- Bounds: min 1, max 60 (as set by `quick-eval` and `generate-cache`)

The limiter is shared across datasets, so fast datasets free slots for slow ones.

## Datasets

| Dataset | Name in CLI | Source | Judge |
|---------|-------------|--------|-------|
| GSM8K | `gsm8k` | `openai/gsm8k` | numeric |
| MATH-500 | `math500` | `HuggingFaceH4/MATH-500` | numeric |
| TruthfulQA (MC1) | `truthfulqa` | `truthfulqa/truthful_qa` | multiple choice |
| GPQA Diamond | `gpqa` | `Idavidrein/gpqa` (`gpqa_diamond`), fallback `hendrydong/gpqa_diamond_mc` | multiple choice |
| MMLU-Pro | `mmlu_pro` | `TIGER-Lab/MMLU-Pro` | multiple choice |
| SimpleQA | `simpleqa` | `basicv8vc/SimpleQA` | exact match |
| HLE | `hle` | `cais/hle` (gated, needs `HF_TOKEN`) | exact match |
| ARC-Challenge | `arc` | `allenai/ai2_arc` | multiple choice |
| HellaSwag | `hellaswag` | `Rowan/hellaswag` (validation) | multiple choice |
| HalluMix | `hallumix` | `quotientai/HalluMix` | exact match |

Known dataset problem: the TruthfulQA loader lists the MC1 options in dataset order, so the correct answer is always option A. TruthfulQA accuracy is inflated until the options are shuffled.

## Regression detection

With `--baseline <file>`, `quick-eval` compares accuracy against the stored baseline (`src/commands/quickEvalBaseline.ts`):

1. One-sided Fisher's exact test (lower tail) per comparison.
2. Holm-Bonferroni correction across comparisons.
3. Significance level 0.10 by default (`--significance`).

At 30 questions per dataset only large drops (roughly 15 percentage points or more) are detectable. Smaller differences are noise.

## Costs

Cost estimates use `costPer1kTokens` from `listAvailableModels()`, which for every client comes from the mock model list. They are placeholders, not real prices.

## CLI reference

Run from `packages/eval`:

```bash
# Cache generation (run rarely, commit results)
npm run eval:generate-cache -- --model google:gemini-3-flash-preview
npm run eval:generate-cache -- --sample 200
npm run eval:generate-cache -- --datasets gsm8k,truthfulqa

# Evaluation
npm run eval                      # all strategies
npm run eval:standard             # also eval:elo, eval:majority
npm run eval:mock                 # mock providers, no API calls
npm run eval -- --model google:gemini-3-flash-preview --sample 50

# Refresh the baseline file with a live run
npm run eval:regenerate-baseline  # quick-eval --no-cache --baseline baselines/quick-eval.json

# CI commands (one strategy each, with regression check)
npm run eval:ci:standard          # also eval:ci:elo, eval:ci:majority, eval:ci:council
```

There is no `eval:council` script; use `npm run eval -- --strategies council`.

## Regenerating caches

- Ensemble cache: when changing model, ensemble size or temperature.
- Baseline cache: when changing model.
- Baseline file (`baselines/quick-eval.json`): when expected accuracy changes on purpose.

```bash
npm run eval:generate-cache -- --model google:gemini-3-flash-preview
npm run eval:regenerate-baseline
git add packages/eval/.cache/ packages/eval/baselines/
```

## File structure

```
packages/eval/
├── .cache/
│   ├── baselines/              committed, single-model results
│   └── ensemble/               committed, raw ensemble responses
├── baselines/
│   └── quick-eval.json         committed, regression reference
├── datasets/                   gitignored, HF downloads
├── docs/
│   └── architecture.md         this file
├── reports/
├── src/
│   ├── commands/
│   │   ├── quickEval.ts        CLI entry point and option parsing
│   │   ├── quickEvalRunner.ts  single and ensemble runs per dataset
│   │   ├── quickEvalOutput.ts  results formatting
│   │   ├── quickEvalBaseline.ts regression detection
│   │   └── generateCache.ts    cache generation
│   ├── lib/
│   │   ├── baselineCache.ts    single-model result cache
│   │   ├── ensembleCache.ts    ensemble response cache
│   │   ├── benchmarkRunner.ts  question execution and cache lookup
│   │   ├── benchmarkDatasetLoaders.ts  HF dataset loaders
│   │   ├── ensembleRunner.ts   parallel model calls, cost estimates
│   │   ├── concurrencyPool.ts  AIMD limiter
│   │   ├── evaluators.ts       numeric, MCQ and exact-match judges
│   │   ├── evaluation.ts       parallel evaluation
│   │   └── consensus.ts        strategy dispatch
│   └── types.ts
└── package.json
```
