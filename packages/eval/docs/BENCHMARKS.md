# Benchmarks

This is the method behind the `/benchmarks` page: what is measured, how, what it costs, and how to reproduce it. The question it answers is "does an ensemble of open models beat its best member?", for under $20 in total.

Status: the tooling is built and has been run end to end with the mock provider. No paid run has been made, so no results are committed and the page shows "benchmarks not run yet".

## What is run

The matrix is one config file, [`bench/matrix.json`](../bench/matrix.json):

| Setting | Value |
| --- | --- |
| Datasets | GSM8K, MMLU-Pro, GPQA (Diamond, 198 questions), TruthfulQA (MC1) |
| Questions | up to 200 per dataset, sampled with seed 42 |
| Answer protocol | `structured`: options shuffled with seed 1729, structured final answer, mechanical scoring |
| Temperature | 0 |
| Open models | Qwen3.5 9B (`openrouter:qwen/qwen3.5-9b`), Llama 3.1 8B Instruct (`openrouter:meta-llama/llama-3.1-8b-instruct`), Gemma 3 12B (`openrouter:google/gemma-3-12b-it`) |
| Ensembles | the three open models with a mechanical majority vote, and with standard consensus written by Qwen3.5 9B |
| Reference | Claude Sonnet 5.5 (`openrouter:anthropic/claude-sonnet-5.5`), run once and cached |
| Budget | $20 |

The three open models come from three families (Qwen, Llama, Gemma) and are 8B to 12B parameters. Ids and prices were taken from the public OpenRouter model list (`GET https://openrouter.ai/api/v1/models`, no key needed) on 2026-11-17, picking cheap current models. Any model spec the eval CLI accepts works in the config, so the same matrix can run on a local Ollama (`ollama:qwen3:8b`) at no cost.

Each dataset has two jobs:

1. **Ensemble**: every question goes to the three open models once. Each model's own answer is scored, which gives the three single-model results. The same three answers are then combined by each ensemble method, which gives the ensemble results. Singles and ensembles are therefore paired on exactly the same answers.
2. **Reference**: every question goes to the premium model once.

### Scoring

All four datasets are scored mechanically, with no LLM judge (`src/lib/methodology.ts`, `src/lib/finalAnswer.ts`):

- Multiple-choice options are shuffled with a fixed seed and the permutation is recorded, so position bias does not favour any answer letter and runs are reproducible.
- Every model is asked for a structured final answer (`generateStructured` with a JSON schema). Servers without strict JSON schema support fall back to `json_object`, then to a plain reply with a `Final answer:` line.
- The final answer is read and compared mechanically: letters for multiple choice, numbers by value for GSM8K.
- A call that fails or times out (300 s per question) counts as wrong. It is not dropped from the sample.
- Mechanical majority counts the final answers and needs no LLM call. Standard consensus is one call to the summarizer, whose answer is scored like any other.

### Statistics

The summary (`src/lib/matrix/summary.ts`) gives, per dataset and configuration:

- accuracy with a 95% Wilson score interval;
- a paired McNemar test against the **best single open model** on that dataset (the one with the highest accuracy), on the questions both answered: exact binomial below 25 discordant pairs, chi-squared with continuity correction above (`src/lib/pairedStats.ts`). The best single model itself has no test;
- failures (calls that errored or timed out);
- cost.

Read the p-values as one test per row. With four datasets and several configurations, a single p below 0.05 is weak evidence; look for the same direction on several datasets. The reference is there to show how far the open models are from a premium model, not as a configuration to beat.

### Cost

Every response records the token usage its provider reported (or an estimate from text length, marked `estimated`) and its cost from the shared price table in `shared-utils` (`@ensemble-ai/shared-utils/pricing`), which holds OpenRouter prices. Open-weight models are keyed `openrouter/<OpenRouter id>` in that table. A configuration's cost on a dataset is:

- single model: that model's answers;
- ensemble: all three models' answers plus that method's consensus calls (none for the mechanical vote);
- reference: the reference model's answers.

When some calls had no price the cost is shown as a lower bound ("at least").

### Estimate before spending

`npm run bench:matrix` prints an estimate first and stops. The estimate counts only questions not already in the results or the reference cache, uses each dataset's mean prompt length, and the token assumptions of `estimateRun` (200 to 2000 output tokens per answer, hidden reasoning included). Today's estimate for the full matrix:

```
dataset     job         questions   calls  low      high
gsm8k       ensemble          200     800  $0.07    $0.50
gsm8k       reference         200     200  $0.45    $4.05
mmlu_pro    ensemble          200     800  $0.08    $0.51
mmlu_pro    reference         200     200  $0.49    $4.09
gpqa        ensemble          198     792  $0.08    $0.50
gpqa        reference         198     198  $0.49    $4.05
truthfulqa  ensemble          200     800  $0.07    $0.50
truthfulqa  reference         200     200  $0.46    $4.06

Total: 3990 calls, $2.18 to $18.27 (budget $20.00).
```

The reference is most of the cost. If the high end is too close to the budget, lower `sample` or pick a cheaper reference in the config.

## How to run it

From the repo root. Real runs need `OPENROUTER_API_KEY` (or no key for a local Ollama).

```bash
# 1. Estimate only (no calls). Also refreshes the app's "not run yet" summary.
npm run bench:matrix --workspace=packages/eval -- --plan-only --publish

# 2. Dry run with the mock provider: the whole pipeline, no cost.
#    Writes to .bench-dry-run/ (gitignored); never commit its output.
npm run bench:matrix:dry-run --workspace=packages/eval

# 3. The real run. Prints the estimate, then spends.
OPENROUTER_API_KEY=... npm run bench:matrix --workspace=packages/eval -- --yes --publish
```

Options of `ensemble-eval matrix`:

| Option | Meaning |
| --- | --- |
| `--config <file>` | matrix config (default `bench/matrix.json`) |
| `--mode free\|mock` | real calls (default) or the mock provider |
| `--yes` | confirm the spend; without it a free-mode run stops after the estimate |
| `--run-id <id>` | default `<date>-<matrix name>`; an existing id resumes that run |
| `--results-dir <dir>` | default `packages/eval/results` |
| `--publish [file]` | also write the summary to `packages/app/src/data/benchmark-summary.json` (or `file`) |
| `--plan-only` | print the estimate and stop; with `--publish`, write a not-run summary |
| `--sample <n>`, `--datasets <list>` | override the config, for dry runs |
| `--concurrency <n>` | questions run at once per job (default 8) |
| `--skip-download` | fail instead of downloading a dataset |

### Resume and cache

Results are written after every batch of questions. Running the same command again with the same `--run-id` skips the questions already answered, and the estimate shows only what is left. The reference answers are kept in a shared cache keyed by model, dataset, sample, seeds, protocol and temperature, so a later run (a new run id, or changed open models) reuses them instead of paying again.

## Results format

```
packages/eval/results/
  <run-id>/
    manifest.json                 run id, mode, status, config as run, estimate, file list
    <dataset>/ensemble.json       BenchmarkResultsFile: the three open models, majority and standard
    <dataset>/reference.json      BenchmarkResultsFile: the reference model
    summary.json                  the summary below
  cache/<mode>/reference/<model>/<dataset>-n<sample>-q<seed>-o<seed>-<protocol>-t<temperature>.json
```

`ensemble.json` and `reference.json` are the `benchmark` command's format (`BenchmarkResultsFile` in `src/types.ts`): one entry per question with the prompt, ground truth, option permutation, every response (content, tokens, `usage`, `estimatedCostUsd`, error), consensus outputs and their `consensusMetrics` (tokens, calls, cost), and the per-model and per-strategy evaluation (`correct`, `predicted`, `failure`).

`summary.json` (schema version 1, `MatrixSummary` in `src/lib/matrix/summary.ts`):

```jsonc
{
  "schemaVersion": 1,
  "status": "complete",          // "not-run" | "partial" | "complete"
  "runId": "2026-11-20-m3-matrix",
  "mode": "free",                // "mock" for dry runs; the page flags those
  "generatedAt": "2026-11-20T10:00:00.000Z",
  "method": { "datasets": [...], "sample": 200, "questionSeed": 42, "optionSeed": 1729,
              "protocol": "structured", "temperature": 0, "confidence": 0.95,
              "models": [{ "id", "label", "spec" }], "summarizer": "qwen",
              "strategies": ["majority", "standard"], "reference": { "id", "label", "spec" } },
  "estimate": { "lowUsd": 2.18, "highUsd": 18.27, "calls": 3990 },
  "totalCostUsd": 9.41,          // what the run spent, every call once
  "datasets": [{
    "dataset": "gsm8k", "n": 200, "bestSingleId": "single:qwen", "spentUsd": 2.3,
    "rows": [{
      "id": "ensemble:majority", "kind": "ensemble", "label": "...", "strategy": "majority",
      "models": [...], "n": 200, "correct": 151, "accuracy": 0.755,
      "ciLower": 0.691, "ciUpper": 0.81, "failures": 2,
      "vsBestSingle": { "pValue": 0.41, "n10": 6, "n01": 9, "method": "exact", "n": 200 },
      "costUsd": 0.31, "costIncomplete": false
    }]
  }]
}
```

Row ids are `single:<model id>`, `ensemble:<strategy>` and `reference`.

## Publishing the results

1. Run the matrix with `--yes --publish`.
2. Commit `packages/eval/results/<run-id>/`, the reference cache under `packages/eval/results/cache/free/`, and `packages/app/src/data/benchmark-summary.json`.
3. Regenerate the report figures (below) and the calibrations (next section).

The `/benchmarks` page reads the committed summary. With status `not-run` it shows "benchmarks not run yet", the estimate and this method; it never shows placeholder numbers. A `mock` summary is shown with a warning that the numbers are not real.

## Regenerating the report

`report/generate_figures.py` reads the results format:

```bash
cd report
python3 generate_figures.py --results ../packages/eval/results/<run-id>   # or: make matrix RUN=...
make pdf
```

This writes `figures/matrix_accuracy.{pdf,png}` (accuracy per dataset and configuration with Wilson intervals), `figures/matrix_cost_accuracy.{pdf,png}` and `figures/matrix_table.tex` (the numbers with p-values). `report.tex` includes a "Benchmark matrix" subsection when `matrix_table.tex` exists. It needs only matplotlib. `make test` runs the script's tests against `report/fixtures/matrix-summary.json`, which is mock data for the tests only. Running `generate_figures.py` with no arguments still builds the February issue-114 figures, from data that is not in the repository.

## Calibration

Two numbers in the app are assumptions until a matrix run exists. Both have a script that fits them from the run.

### Agreement labels

The app labels agreement high, medium or low from the cosine similarity of answer embeddings. Cosines sit in a narrow band that differs per embedding model, so the original cut-offs ((cosine + 1) / 2 above 0.8 is high, from 0.5 medium) make unrelated answers look like moderate agreement.

```bash
npm run calibrate:agreement --workspace=packages/eval -- \
  --results packages/eval/results/<run-id> --embedding openai:text-embedding-3-small          # prints the count and cost
npm run calibrate:agreement --workspace=packages/eval -- \
  --results packages/eval/results/<run-id> --embedding openai:text-embedding-3-small --yes    # embeds and fits
```

It takes every pair of answers to the same question whose final answers were both read mechanically, labels the pair agree or disagree by comparing those answers, embeds each answer with the given model (as the app would), and fits:

- `medium`: the cosine that best separates agreeing from disagreeing pairs (largest Youden J);
- `high`: the lowest cosine above which at least 90% of pairs agree (`--high-precision`), with at least 10 pairs above it;
- the ROC AUC, as a check that cosine predicts agreement at all (a warning below 0.6).

Scored pairs are cached under `<run-id>/calibration/`, so a refit costs nothing. The result is merged into `packages/app/src/data/agreement-calibration.json`, keyed by embedding model (`openai/text-embedding-3-small`, `google/gemini-embedding-2`, `ollama/nomic-embed-text`). Embedding specs: `openai:text-embedding-3-small`, `google:gemini-embedding-2`, or an endpoint and model such as `ollama:nomic-embed-text`. The app reads that file (`packages/app/src/lib/agreementCalibration.ts`): for a calibrated model it uses the fitted cut-offs and names the model; otherwise it keeps the original mapping and marks the labels "Uncalibrated". The committed file has no entries yet.

### Token assumptions of the cost estimate

```bash
npm run calibrate:tokens --workspace=packages/eval -- --results packages/eval/results/<run-id>
npm run build --workspace=packages/shared-utils
```

This makes no calls. From the recorded usage it fits the answer range (10th and 90th percentile of billed output tokens per answer or one-call synthesis, so hidden reasoning tokens are included where the provider reports them) and the consensus overhead (median synthesis input less the prompt and the answers it was given). It writes `packages/shared-utils/src/pricing/tokenCalibration.ts`, which `estimateRun` reads over the hand-set defaults in `tokenAssumptions.ts`. Verdict and critique lengths are not fitted, because the matrix runs no ELO or council consensus. The committed module is `null`, so the defaults apply.
