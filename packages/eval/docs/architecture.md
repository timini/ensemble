# Eval Pipeline Architecture

## Overview

The eval pipeline asks whether ensemble consensus strategies beat a single model. For each benchmark question it runs the model once (the single baseline), runs the same model N times as an ensemble, combines the N answers with each consensus strategy, and scores everything against ground truth.

In `quick-eval` the ensemble is the same model sampled N times at a non-zero temperature. The `benchmark` command takes any list of models (`--models`), so it can run an ensemble of different models, for example three open models through OpenRouter or a local Ollama.

## Model specs

Models are written as `provider:model`:

| Form | Example | Notes |
|------|---------|-------|
| `provider:model` | `openai:gpt-4o`, `google:gemini-2.5-flash` | Key from `OPENAI_API_KEY`, `GOOGLE_API_KEY` and so on |
| `<endpoint>:model` | `openrouter:qwen/qwen3-14b`, `ollama:llama3.2:3b` | OpenAI-compatible presets: `openrouter`, `groq`, `together`, `ollama`, `lmstudio`, `llamacpp`, `vllm` |
| `compat:<baseURL>#<model>` | `compat:http://localhost:8081/v1#my-model` | Any other OpenAI-compatible server |

Preset endpoints read their key from `<PRESET>_API_KEY` (`OPENROUTER_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `OLLAMA_API_KEY` and so on) and can be pointed elsewhere with `<PRESET>_BASE_URL`. `compat:` endpoints read `OPENAI_COMPATIBLE_API_KEY`. OpenRouter, Groq and Together refuse to start in free mode without their key; local servers and `compat:` endpoints run with an empty key. Results record these models as `openai-compatible:<endpoint>/<model>` (see `src/lib/modelSpecs.ts` and `src/lib/providers.ts`).

## Answer protocols

Runs use one of two answer protocols (`src/lib/methodology.ts`):

- `structured`, the default for every new run (`benchmark`, `baseline`, `generate-cache`, and `quick-eval` without a cache):
  - Multiple-choice options (TruthfulQA, GPQA, MMLU-Pro, ARC, HellaSwag) are shuffled with a fixed seed (`--option-seed`, default 1729) mixed with the question id, so each question has its own order and every run gets the same one. Each run records `optionPermutation` (displayed option i was dataset option `optionPermutation[i]`) and `optionSeed`. Without shuffling, TruthfulQA always had the right answer at A.
  - Every prompt ends with an instruction asking for a final answer. The model is called through `generateStructured` with a `{ reasoning, answer }` schema; choice answers are limited to the option letters and yes/no answers to yes or no. OpenAI-compatible clients fall back from strict `json_schema` to `json_object` to a prompt by themselves. If the call still fails with a format error, the model is asked again for a plain reply that ends with `Final answer: <answer>`. Each response records `answerSource` (`structured` or `text`).
  - Answers are read mechanically (`src/lib/finalAnswer.ts`): the JSON `answer` field, then the last `Final answer:` line, then the dataset's free-text parser. Choice, numeric (GSM8K), LaTeX (MATH-500) and yes/no (HalluMix) answers need no LLM judge. Only SimpleQA and HLE still use one.
  - `majority` is a mechanical vote over the extracted answers, with no LLM call. Ties go to the answer given first.
- `legacy`: the prompts exactly as the loaders build them, unshuffled, scored by the LLM judge. Only used to score the committed caches, whose replies answered those prompts.

## Failures count as wrong

A response that errors or times out is scored wrong, not dropped. Each such result records `failure: 'error' | 'timeout'`. A question that fails or runs past `--question-timeout` as a whole is recorded with `failure` set and every model and strategy scored wrong. A strategy that fails or cannot run (for example ELO with fewer than 3 answers) is scored wrong as an error. Reports show errors and timeouts in their own columns as well.

## Judges

Where a judge is still needed it must be a different model from the generators. `benchmark` takes `--judge`, or uses `--summarizer` when it is not one of the `--models`. `quick-eval`, `generate-cache` and `baseline` refuse a judge that is also the model under test. `--allow-same-judge` forces it.

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
2. **Consensus.** Each selected strategy turns the N responses into one answer using a consensus model (`--consensus-model`). On structured runs `majority` is a mechanical vote with no LLM call (see Answer protocols). On legacy runs all four use LLM calls; majority uses them only to extract answers unless its vote falls back:
   - `standard`: the consensus model summarizes the responses.
   - `elo`: pairwise LLM comparisons produce Elo ratings; the top responses are synthesized.
   - `majority`: one structured call to the consensus model extracts a short final answer from each response. The answers are normalised and counted. When one answer has the most votes (at least 2), that bare answer is the consensus text; a numeric winner is given as its canonical value (`1/2` becomes `0.5`). On a tie, when most answers are long-form, or when extraction fails, the consensus model ranks the responses and synthesizes an answer from the top ones. That is 1 to 3 calls in all, and the reported `tokenCount` includes the extraction call. Majority results saved before the mechanical vote was added used only the rank-and-synthesize method and are not comparable with newer results. Consensus outputs are not cached, so rerunning `quick-eval` on cached ensembles gives the new behaviour.
   - `council`: extra LLM rounds of critique, rebuttal and judgment.
3. **Evaluation.** Each individual response and each consensus answer is scored (see `src/lib/evaluators.ts`). On structured runs the final answer is read mechanically (`MechanicalEvaluator`) except for HLE and SimpleQA, which use the exact-match judge. On legacy runs an LLM judge (`--judge-model`) scores everything through `generateStructured`:
   - GSM8K, MATH-500: numeric judge (a regex numeric evaluator exists for when no judge is configured)
   - TruthfulQA, GPQA, MMLU-Pro, ARC, HellaSwag: multiple-choice judge
   - HLE, SimpleQA, HalluMix: exact-match judge

## Caches

`.cache/` is committed so runs can reuse expensive model output.

```
.cache/
├── baselines/   single-model results, key {model}_{dataset}.json (legacy) or {model}_{dataset}_structured.json
└── ensemble/    raw ensemble responses, key {model}_{dataset}_{N}x_t{temp}.json (legacy) or ..._structured.json
datasets/        HuggingFace downloads (gitignored; cached in CI as eval-datasets-v2)
```

What is committed today: legacy baseline and ensemble caches for `google:gemini-3-flash-preview`, 5x at t=0.7, for nine datasets (all except HalluMix). Structured caches are saved under separate `_structured` file names, so they never mix with legacy replies.

| Cache | Key | Changes when |
|-------|-----|--------------|
| Baseline | `{model}_{dataset}` | Model changes. Not keyed by sample size; partial hits fall back to a live run |
| Ensemble | `{model}_{dataset}_{N}x_t{temp}` | Model, ensemble size or temperature changes |

When `quick-eval` finds an ensemble cache for the requested model, it loads the full dataset shuffled with seed 42, keeps only the cached question ids, and takes the first `--sample` of them. Every question then hits the cache. A structured cache is preferred; a legacy cache (the committed ones) is scored with the legacy protocol (`src/commands/quickEvalDatasets.ts`). Without a matching cache it takes a seed-42 sample and makes live calls with the structured protocol.

`--no-cache` (and `--mode mock`) disables cache lookups for that run. It does not delete cache files.

### Model defaults

Defaults live in `src/lib/evalDefaults.ts` and are shared by `quick-eval`, `generate-cache` and the `eval:ci*` scripts (a unit test keeps them in step):

- Model: `google:gemini-3-flash-preview`, the model of the committed caches, so default and CI runs hit them.
- Judge: `google:gemini-2.5-flash`, the judge that scored the committed single-model baseline cache.
- Consensus model: `google:gemini-2.5-flash-lite`. On a cached run the consensus calls (plus judge calls) are the only live calls, so they use the cheapest model.

If the saved baseline file was produced with a different model, ensemble size, sample size or answer protocol (a baseline with no `protocol` field is legacy), `quick-eval --baseline` skips the regression check, says why, and writes a fresh baseline.

### Sample size

Real runs default to 200 questions per dataset (`DEFAULT_SAMPLE_FREE`) for `quick-eval`, `benchmark` and `baseline`; mock runs default to 20. Smaller real runs print a warning. The `eval:ci*` and `eval:regenerate-baseline` scripts pass `--sample 30` so CI stays on the committed caches and the committed baseline.

### Generate, then evaluate

`generate-cache` (run rarely, commit the output):

- For each dataset: shuffle with seed 42 (`--seed`), take the first 200 questions (`--sample`), generate N responses per question with the structured protocol (`--protocol legacy` for the old one), save to `.cache/ensemble/`. It also writes the single baseline cache, scored mechanically or, for SimpleQA and HLE, with `--judge-model`.

`quick-eval` (run often):

- Load cached responses, run the consensus strategies, judge, and optionally check for regressions against a baseline file.

## CI

`.github/workflows/eval-ci.yml` makes paid calls, so it does not run on every PR. It runs on manual dispatch (with a `strategies` input) or on pull requests that touch the consensus packages, `shared-utils` or `eval` and carry the `run-eval` label. On a PR, a path filter decides which strategies are affected, and each affected strategy runs as its own job with `npm run eval:ci:<strategy>`. The jobs need a Google API key secret. A final `eval-report` job downloads the results and posts a PR comment. A job fails if regressions are detected.

Each job builds the consensus packages, `shared-utils` and `eval`, then runs `quick-eval` with `--baseline baselines/quick-eval.json` and `--question-timeout 300`. Ensemble responses and the single-model baseline come from the committed caches; consensus and judge calls are live.

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

The TruthfulQA MC1 options come in dataset order with the correct answer always at A. Loaders keep each multiple-choice question's stem, options and correct index (`multipleChoice`), and structured runs shuffle them (see Answer protocols). GPQA options are parsed from the `(A) ...` lines of the problem text; a problem whose options cannot be parsed keeps its text and is not shuffled. The "Judge" column applies to legacy runs; on structured runs only SimpleQA and HLE use a judge.

## Regression detection

With `--baseline <file>`, `quick-eval` compares accuracy against the stored baseline (`src/commands/quickEvalBaseline.ts`):

1. One-sided Fisher's exact test (lower tail) per comparison.
2. Holm-Bonferroni correction across comparisons.
3. Significance level 0.10 by default (`--significance`).

At 30 questions per dataset only large drops (roughly 15 percentage points or more) are detectable. Smaller differences are noise.

## Reports and statistics

Every report gives each accuracy with a 95% Wilson score interval and pairs each strategy with the single model on the same questions for a McNemar test (`src/lib/pairedStats.ts`): exact binomial below 25 discordant pairs, chi-squared with continuity correction above. `quick-eval` prints these per dataset and overall; `analyze` writes them for every strategy against every model.

## Costs

Costs come from the shared price table in `shared-utils` (`@ensemble-ai/shared-utils/pricing`), using the token usage the provider reported, or an estimate from text length (`costFromTextLength`) when it reported none. Models on a local server (an Ollama, LM Studio, llama.cpp or vLLM preset at a loopback URL) cost $0. OpenRouter models use OpenRouter prices from the table. Models the table does not have get no cost and count as $0 in totals. Consensus calls are priced the same way (`consensusMetrics.costUsd`), so a strategy's cost is the ensemble answers plus its own consensus calls. Judge calls are not priced.

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

# Benchmark any mix of models, including OpenRouter and local servers
node --import tsx bin/ensemble-eval.mjs benchmark gsm8k \
  --models openrouter:qwen/qwen3-14b,openrouter:meta-llama/llama-3.1-8b-instruct,ollama:gemma3:12b \
  --strategies standard,majority --mode free --output results/gsm8k.json
node --import tsx bin/ensemble-eval.mjs benchmark simpleqa --models ollama:llama3.2 \
  --judge google:gemini-2.5-flash --mode free --output results/simpleqa.json
node --import tsx bin/ensemble-eval.mjs analyze results/gsm8k.json --report results/gsm8k.md

# Refresh the baseline file with a live run
npm run eval:regenerate-baseline  # quick-eval --sample 30 --no-cache --baseline baselines/quick-eval.json

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
│   │   ├── quickEvalDatasets.ts question and protocol choice per dataset
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
│   │   ├── evaluators.ts       mechanical scoring, numeric, MCQ and exact-match judges
│   │   ├── evaluation.ts       parallel evaluation, failures counted wrong
│   │   ├── finalAnswer.ts      structured final answer schema, extraction, comparison
│   │   ├── methodology.ts      answer protocols, option shuffling
│   │   ├── mechanicalMajority.ts majority vote with no LLM call
│   │   ├── modelSpecs.ts       model spec parsing, OpenAI-compatible endpoints
│   │   ├── providers.ts        provider registration and keys
│   │   ├── pairedStats.ts      Wilson intervals and paired McNemar tests
│   │   └── consensus.ts        strategy dispatch, consensus cost
│   └── types.ts
└── package.json
```
