# Eval Pipeline Architecture

## Overview

The eval pipeline measures whether ensemble consensus strategies improve accuracy over a single model baseline. It runs a model against benchmark datasets, then runs the same model N times as an ensemble with different consensus strategies, comparing accuracy.

```
                    ┌─────────────┐
                    │  quick-eval │   CLI entry point
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ Dataset1 │ │ Dataset2 │ │ DatasetN │  10 benchmark datasets
         └────┬─────┘ └────┬─────┘ └────┬─────┘  loaded in parallel
              │            │            │
              ▼            ▼            ▼
         ┌──────────────────────────────────┐
         │        Per-Dataset Runner         │  runs single + ensemble
         │  ┌──────────┐  ┌──────────────┐  │
         │  │ Single 1x │  │ Ensemble 5x  │  │
         │  │ baseline  │  │ + consensus  │  │
         │  └──────────┘  └──────────────┘  │
         └──────────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │     Results + Regression Check    │
         └──────────────────────────────────┘
```

## Data Flow: Per-Question Execution

Each question goes through this pipeline:

```
  Question
     │
     ▼
  ┌──────────────────────────────────────────────────────────┐
  │ Step 1: Ensemble Generation (EXPENSIVE - cached)         │
  │                                                          │
  │  Prompt ──► Model Instance 1 ──► Response 1              │
  │         ──► Model Instance 2 ──► Response 2              │
  │         ──► Model Instance 3 ──► Response 3              │
  │         ──► Model Instance 4 ──► Response 4              │
  │         ──► Model Instance 5 ──► Response 5              │
  │                                                          │
  │  5 parallel API calls, same model, temperature=0.7       │
  │  These responses are SHARED across all strategies        │
  │  Cached in .cache/ensemble/ after first run              │
  └──────────────────┬───────────────────────────────────────┘
                     │
                     │  ProviderResponse[] (5 responses)
                     │
                     ▼
  ┌──────────────────────────────────────────────────────────┐
  │ Step 2: Consensus Generation (per-strategy)              │
  │                                                          │
  │  Responses ──► Standard strategy ──► consensus answer    │
  │            ──► ELO strategy      ──► consensus answer    │
  │            ──► Majority strategy ──► consensus answer    │
  │            ──► Council strategy  ──► consensus answer    │
  │                                                          │
  │  Each strategy produces ONE consensus answer from the    │
  │  5 responses. Some strategies make additional API calls  │
  │  (e.g. council does critique/rebuttal/judgment rounds).  │
  └──────────────────┬───────────────────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────────────────┐
  │ Step 3: Evaluation (per-response + per-strategy)         │
  │                                                          │
  │  Each response evaluated against ground truth:           │
  │   - Numeric evaluator (GSM8K, MATH-500)                 │
  │   - MCQ evaluator (TruthfulQA, GPQA, MMLU-Pro, etc.)   │
  │   - LLM judge (SimpleQA, HLE, free-text answers)        │
  │                                                          │
  │  Each consensus answer also evaluated.                   │
  │  All evaluations run in parallel (Promise.all).          │
  └──────────────────────────────────────────────────────────┘
```

## Cache Architecture

There are three cache layers. The first two are committed to the repository so they are available in CI and for local development without regeneration.

```
  .cache/
  ├── baselines/          ← Single-model baseline results (committed)
  │   │                     Key: {model}_{dataset}_n{sample}.json
  │   │                     Contains: full PromptRunResult[] for single runs
  │   │                     Eliminates: single-model API calls
  │   ├── google_gemini-2.5-flash-lite_gsm8k_n30.json
  │   └── google_gemini-2.5-flash-lite_truthfulqa_n30.json
  │
  ├── ensemble/           ← Raw ensemble API responses (committed)
  │   │                     Key: {model}_{dataset}_{N}x_t{temp}_n{sample}.json
  │   │                     Contains: questionId → ProviderResponse[]
  │   │                     Eliminates: ALL ensemble API calls
  │   ├── google_gemini-2.5-flash-lite_gsm8k_5x_t0.7_n30.json
  │   └── google_gemini-2.5-flash-lite_truthfulqa_5x_t0.7_n30.json
  │
  └── datasets/           ← HuggingFace dataset downloads (gitignored)
                            Cached in CI via actions/cache
                            Key: eval-datasets-v1
```

### Cache Key Design

Cache keys encode all parameters that affect the output:

| Cache | Key Format | Invalidated When |
|-------|-----------|-----------------|
| Baseline | `{model}_{dataset}_n{sample}` | Model or sample size changes |
| Ensemble | `{model}_{dataset}_{N}x_t{temp}_n{sample}` | Model, ensemble size, temperature, or sample changes |
| Dataset | `eval-datasets-v1` | Manual bump (HF data rarely changes) |

### Using a Pro Model for Ensemble Responses

Since ensemble responses are cached and committed to the repo, you only pay for API generation once. This means you can use a more capable (expensive) model for the initial generation:

```bash
# One-time: generate ensemble responses with a pro model
npm run eval -- --model google:gemini-2.5-pro --ensemble 5 --sample 30 --no-cache

# The responses are now in .cache/ensemble/
# Commit them:
git add .cache/ensemble/
git commit -m "chore: cache ensemble responses (gemini-2.5-pro)"

# All subsequent runs (local + CI) load from cache:
npm run eval:ci:standard    # no ensemble API calls, only consensus + eval
```

The cache key includes the model name, so switching models naturally invalidates the cache. You can have caches for multiple models simultaneously.

## CI Pipeline: 4 Parallel Strategy Jobs

Each consensus strategy runs as an independent CI job. All 4 jobs share the same committed cache files.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    Pull Request                              │
  └──────┬──────────┬──────────┬──────────┬─────────────────────┘
         │          │          │          │
         ▼          ▼          ▼          ▼
  ┌───────────┐┌───────────┐┌───────────┐┌───────────┐
  │ standard  ││   elo     ││ majority  ││ council   │   4 parallel
  │           ││           ││           ││           │   GitHub Actions
  │ 1. checkout│ 1. checkout│ 1. checkout│ 1. checkout│  runners
  │ 2. install ││ 2. install ││ 2. install ││ 2. install │
  │ 3. build  ││ 3. build  ││ 3. build  ││ 3. build  │
  │ 4. run    ││ 4. run    ││ 4. run    ││ 4. run    │
  │ 5. upload ││ 5. upload ││ 5. upload ││ 5. upload │
  └─────┬─────┘└─────┬─────┘└─────┬─────┘└─────┬─────┘
        │            │            │            │
        └────────────┼────────────┼────────────┘
                     ▼
              ┌─────────────┐
              │ eval-report │   Downloads all 4 artifacts
              │             │   Posts combined PR comment
              └─────────────┘
```

### What Each Job Actually Executes

With ensemble responses cached in the repo:

```
  ┌────────────────────────────────────────────────────────┐
  │                    Per Job                              │
  │                                                        │
  │  For each of 10 datasets × 30 questions:               │
  │                                                        │
  │  ┌─ Single baseline ──────────────────────────────┐    │
  │  │  Load from .cache/baselines/ (committed)       │    │
  │  │  NO API calls                                  │    │
  │  └────────────────────────────────────────────────┘    │
  │                                                        │
  │  ┌─ Ensemble responses ───────────────────────────┐    │
  │  │  Load from .cache/ensemble/ (committed)        │    │
  │  │  NO API calls                                  │    │
  │  └────────────────────────────────────────────────┘    │
  │                                                        │
  │  ┌─ Consensus generation ─────────────────────────┐    │
  │  │  Run ONLY this job's strategy                  │    │
  │  │  API calls: summarizer LLM (lightweight)       │    │
  │  └────────────────────────────────────────────────┘    │
  │                                                        │
  │  ┌─ Evaluation ───────────────────────────────────┐    │
  │  │  LLM judge evaluates each response + consensus │    │
  │  │  API calls: judge model (lightweight)          │    │
  │  └────────────────────────────────────────────────┘    │
  │                                                        │
  │  ┌─ Regression check ─────────────────────────────┐    │
  │  │  Compare this strategy against baseline        │    │
  │  │  Fisher exact test + Holm-Bonferroni           │    │
  │  │  NO API calls                                  │    │
  │  └────────────────────────────────────────────────┘    │
  └────────────────────────────────────────────────────────┘
```

### Why Separate Jobs Work Now (But Didn't Before)

Before the ensemble cache, each job would have independently called the model API 5 times per question (the expensive ensemble generation step). With 4 jobs that's 4x the API cost, and all 4 jobs hitting the same API key would cause rate limit storms.

With the ensemble cache committed to the repo:
- **Zero ensemble API calls** in CI (all loaded from cache)
- **No rate limit contention** between jobs (only lightweight consensus/judge calls)
- **Fault isolation** (council breaking doesn't block standard/elo/majority)
- **Parallel execution** (wall time = slowest job, not sum of all)

### Rate Limits

Each job shares the same Google API key. The only API calls are:
- Consensus summarizer calls (1 per question per strategy)
- LLM judge evaluation calls (1 per response + 1 per consensus answer)

The AIMD concurrency limiter in each job independently adapts to rate limits. Since the load per job is light (~300 questions × 1-2 calls each), contention between jobs is minimal.

## Concurrency: AIMD Limiter

All API calls within a job are governed by a shared `ConcurrencyLimiter` using AIMD (Additive Increase, Multiplicative Decrease) — the same algorithm TCP uses.

```
  Concurrency
  Limit
    60 ┤ ╭──────────────── max
       │╱
    40 ┤  ← start
       │    ╲
    20 ┤     ╲ ← 429 error: halve
       │      ╲
    10 ┤       ╰───────╮
       │        +1/success ╲ ← another 429
     5 ┤                    ╰──
     1 ┤                       min
       └────────────────────────── time
```

- **Initial**: 40 concurrent questions
- **On success**: +1 to limit (slow ramp up)
- **On 429**: halve the limit (fast back-off)
- **Cooldown**: 2s between adjustments (prevents oscillation)
- **Bounds**: min=1, max=60

The limiter is shared across ALL datasets within a job. Fast-completing datasets free slots for slower ones automatically.

## Benchmark Datasets

| Dataset | Questions | Category | Evaluator | Source |
|---------|----------|----------|-----------|--------|
| GSM8K | 1,319 | Grade school math | Numeric + LLM judge | `openai/gsm8k` |
| MATH-500 | 500 | Competition math | Numeric + LLM judge | `HuggingFaceH4/MATH-500` |
| TruthfulQA | 817 | Misconceptions | MCQ (A-D) | `truthfulqa/truthful_qa` |
| GPQA | 448 | PhD-level science | MCQ (A-D) | `Idavidrein/gpqa` |
| MMLU-Pro | 12,032 | General knowledge | MCQ (A-J, 10 choices) | `TIGER-Lab/MMLU-Pro` |
| SimpleQA | 4,326 | Short-answer factuality | Exact-match + LLM judge | `openai/simple-qa` |
| HLE | 2,694 | Very hard mixed | Exact-match + LLM judge | `cais/hle` |
| ARC | 1,172 | Science knowledge | MCQ (A-D) | `allenai/ai2_arc` |
| HellaSwag | 10,042 | Commonsense reasoning | MCQ (A-D) | `Rowan/hellaswag` |
| HalluMix | ~6,500 | Hallucination detection | LLM judge | `quotientai/HalluMix` |

Each CI run samples 30 questions per dataset (configurable via `--sample`).

## Regression Detection

Each CI job compares its strategy accuracy against the committed baseline using:

1. **Fisher's exact test** (one-sided, lower tail) — tests if current accuracy is significantly worse
2. **Holm-Bonferroni correction** — controls family-wise error rate across multiple comparisons
3. **Significance level** α = 0.10 (configurable via `--significance`)

At n=30 questions per dataset (300 total), the test can detect ~15pp regressions. Smaller deltas are noise.

## CLI Reference

```bash
# Run all strategies locally
npm run eval

# Run a specific strategy
npm run eval:standard
npm run eval:elo

# Run with custom model and sample size
npm run eval -- --model google:gemini-2.5-pro --sample 50

# Regenerate ensemble cache with a different model
npm run eval -- --model google:gemini-2.5-pro --no-cache

# Regenerate baseline (clears all caches)
npm run eval:regenerate-baseline

# CI commands (per-strategy, with regression check)
npm run eval:ci:standard
npm run eval:ci:elo
npm run eval:ci:majority
npm run eval:ci:council
```

## Regenerating Caches

### When to Regenerate

- **Ensemble cache**: When changing `--model`, `--ensemble`, `--temperature`, or `--sample`
- **Baseline cache**: When changing `--model` or `--sample`
- **Baseline file**: When intentionally changing expected accuracy thresholds

### How to Regenerate

```bash
# 1. Regenerate everything (clears caches, runs fresh, saves new baseline)
npm run eval:regenerate-baseline

# 2. Commit the updated caches and baseline
git add .cache/ baselines/
git commit -m "chore: regenerate eval caches and baseline"
```

### Upgrading the Ensemble Model

Since ensemble responses are cached, you can invest in a stronger model:

```bash
# Generate responses with pro model (one-time cost)
npm run eval -- --model google:gemini-2.5-pro --no-cache

# Commit the cache
git add .cache/ensemble/
git commit -m "chore: upgrade ensemble cache to gemini-2.5-pro"

# Now all CI runs use pro-quality responses at zero API cost
# Only consensus + evaluation calls hit the API
```

## File Structure

```
packages/eval/
├── .cache/
│   ├── baselines/              Committed — single-model results
│   └── ensemble/               Committed — raw ensemble responses
├── baselines/
│   └── quick-eval.json         Committed — regression check reference
├── datasets/                   Gitignored — HF downloads (CI-cached)
├── docs/
│   └── architecture.md         This file
├── src/
│   ├── commands/
│   │   ├── quickEval.ts        CLI entry point + option parsing
│   │   ├── quickEvalRunner.ts  Orchestrates single + ensemble runs
│   │   ├── quickEvalOutput.ts  Results formatting
│   │   └── quickEvalBaseline.ts Regression detection
│   ├── lib/
│   │   ├── baselineCache.ts    Single-model result cache
│   │   ├── ensembleCache.ts    Ensemble response cache
│   │   ├── benchmarkRunner.ts  Question execution + cache lookup
│   │   ├── ensembleRunner.ts   Parallel model API calls
│   │   ├── concurrencyPool.ts  AIMD adaptive limiter
│   │   ├── evaluators.ts       Numeric/MCQ/LLM judge evaluators
│   │   ├── evaluation.ts       Parallel evaluation orchestration
│   │   └── consensus.ts        Strategy dispatch
│   └── types.ts
└── package.json
```
