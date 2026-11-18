# Benchmarks

This is the method behind the `/benchmarks` page: what is measured, how, what it costs, and how to reproduce it. The question it answers is "does an ensemble of open models beat its best member?", for under $20 in total.

Status: run `2026-11-17-m3-matrix` is committed and published on the page. The open-model part is complete. The reference has no results yet, so the page shows it as coming soon, and the agreement and token calibrations have not been fitted. See [Run log](#run-log).

## What is run

The matrix is one config file, [`bench/matrix.json`](../bench/matrix.json):

| Setting | Value |
| --- | --- |
| Datasets | GSM8K, MMLU-Pro, GPQA (Diamond, 198 questions: see below), TruthfulQA (MC1) |
| Questions | up to 200 per dataset, sampled with seed 42 |
| Answer protocol | `structured`: options shuffled with seed 1729, structured final answer, mechanical scoring |
| Temperature | 0 |
| Open models | Qwen3.5 9B (`openrouter:qwen/qwen3.5-9b`), Llama 3.1 8B Instruct (`openrouter:meta-llama/llama-3.1-8b-instruct`), Gemma 3 12B (`openrouter:google/gemma-3-12b-it`) |
| Ensembles | the three open models with a mechanical majority vote, and with standard consensus written by Qwen3.5 9B |
| Reference | Claude Sonnet 5.5 (`openrouter:anthropic/claude-sonnet-5.5`), run once and cached |
| Budget | $20 |

GPQA Diamond has only 198 questions, so it falls short of the vision's rule of at least 200 questions per dataset before any accuracy claim. Its numbers are indicative only, and the `/benchmarks` page says so under its table (any dataset with fewer than 200 questions gets that note).

The three open models come from three families (Qwen, Llama, Gemma) and are 8B to 12B parameters. Ids and prices were taken from the public OpenRouter model list (`GET https://openrouter.ai/api/v1/models`, no key needed) on 2026-11-17, picking cheap current models. Any model spec the eval CLI accepts works in the config, so the same matrix can run on a local Ollama (`ollama:qwen3:8b`) at no cost.

Each dataset has two jobs:

1. **Ensemble**: every question goes to the three open models once. Each model's own answer is scored, which gives the three single-model results. The same three answers are then combined by each ensemble method, which gives the ensemble results. Singles and ensembles are therefore paired on exactly the same answers.
2. **Reference**: every question goes to the premium model once.

### Scoring

All four datasets are scored mechanically, with no LLM judge (`src/lib/methodology.ts`, `src/lib/finalAnswer.ts`):

- Multiple-choice options are shuffled with a fixed seed and the permutation is recorded, so position bias does not favour any answer letter and runs are reproducible.
- Every model is asked for a structured final answer (`generateStructured` with a JSON schema). Servers without strict JSON schema support fall back to `json_object`, then to a plain reply with a `Final answer:` line. A structured reply that comes back empty also falls back to the plain reply; `structuredFallback` on the answer says why.
- The final answer is read and compared mechanically: letters for multiple choice, numbers by value for GSM8K.
- Transient failures are retried with exponential backoff and jitter (`maxRetries`, default 4): network errors such as `fetch failed` or `ECONNRESET`, 429 and 5xx (waiting for `Retry-After` when given), per-call timeouts and empty replies. An empty reply, or an error the server sends inside a 200 response, is a failed call, never an answer. Its error names the finish reasons, the OpenRouter host that served it, the response id and the completion tokens.
- Each model call has a limit (`callTimeoutMs`, default 180 s) and each summarizer call another (`consensusTimeoutMs`, default 300 s). The request is aborted when its limit passes.
- A question has a hard limit (`questionTimeoutMs`, default 900 s, counted from when it gets a slot). Retries fit inside it: model calls must end by the limit minus `consensusTimeoutMs`, the summary by the limit itself (less a few seconds for scoring). No retry starts that could not finish in time, and a call still running at its deadline is aborted and counts as a timeout. Answers that came back are kept and scored; a timeout never discards them.
- Every call sends `max_tokens` (`maxOutputTokens`, default 4096): model answers, structured or plain, summarizer calls and judge calls. Without it OpenRouter reserves the model's maximum output (65536 tokens for some models) against the account balance for each request, and refuses with HTTP 402 ("requires more credits, or fewer max_tokens") once the balance is low, although the answer itself would be a few hundred tokens. The limit is an infrastructure setting, not an experiment setting: answers here need far fewer than 4096 tokens, so it does not change results. It is left out of the settings a resumed run must keep, and a run, or a `--retry-failed` repair, may change it without `--allow-config-change`. The manifest keeps the config of each repair, so the value used is on record.
- HTTP 402 is not retried: the same request meets the same balance. The call counts as failed, like any other, and `--retry-failed` runs it again once the balance is topped up.
- A call that still fails after its retries, or a question that times out, counts as wrong. It is not dropped from the sample, and failures are reported in their own column.
- On OpenRouter, structured calls ask for hosts that honour `response_format` (`provider.require_parameters`). `requireParameters: false` in the config, or `--no-require-parameters`, turns that off; runs made before 2026-11-17 evening did not send it. A model entry can carry `routing`, sent as OpenRouter's `provider` object, for example `{ "ignore": ["SomeHost"] }` to avoid a host the logs show returning empty replies. The manifest records the routing a run started with and that of each repair.
- Mechanical majority counts the final answers and needs no LLM call. Standard consensus is one call to the summarizer, whose answer is scored like any other.

### Statistics

The summary (`src/lib/matrix/summary.ts`) gives, per dataset and configuration:

- accuracy with a 95% Wilson score interval;
- a paired McNemar test against the **best single open model** on that dataset (the one with the highest accuracy), on the questions both answered: exact binomial below 25 discordant pairs, chi-squared with continuity correction above (`src/lib/pairedStats.ts`). The best single model itself has no test;
- failures (calls that errored or timed out);
- cost.

The reference is shown only when every one of its calls on that dataset came back. Otherwise its row is left out and the dataset gets a `referencePending` note with how many questions it answered, how many failed and why (`out-of-credit` for HTTP 402, `refused` for a content filter or refusal, `other`). A premium model scored on part of the sample, with the rest counted wrong, would say nothing about that model. The page then shows the reference as coming soon. The counts and reasons stay in the run's own `summary.json`; the copy published to the app keeps only `answered`. What the reference's answers cost still counts in the dataset's `spentUsd`.

Read the p-values as one test per row. With four datasets and several configurations, a single p below 0.05 is weak evidence; look for the same direction on several datasets. The reference is there to show how far the open models are from a premium model, not as a configuration to beat.

### Cost

Every response records the token usage its provider reported (or an estimate from text length, marked `estimated`) and its cost from the shared price table in `shared-utils` (`@ensemble-ai/shared-utils/pricing`), which holds OpenRouter prices. Open-weight models are keyed `openrouter/<OpenRouter id>` in that table. A configuration's cost on a dataset is:

- single model: that model's answers;
- ensemble: all three models' answers plus that method's consensus calls (none for the mechanical vote);
- reference: the reference model's answers.

When some calls had no price the cost is shown as a lower bound ("at least"). The run total on the page is the cost of the results: every call once, and the reference answers count even when this run took them from the shared cache rather than paying for them again.

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

From the repo root. Real runs need `OPENROUTER_API_KEY` (or no key for a local Ollama). npm runs workspace scripts from `packages/eval`, so relative paths given to any of these commands (`--config`, `--results-dir`, `--publish <file>`, `--results`, `--output`) are relative to `packages/eval`, not to the repo root. Use `results/<run-id>`, or an absolute path.

```bash
# 1. Estimate only (no calls). Also refreshes the app's "not run yet" summary,
#    unless the app summary already holds results (then add --force to replace it).
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
| `--publish [file]` | also write the summary to `packages/app/src/data/benchmark-summary.json` (or `file`). A mock run is never written to the app summary; give it a scratch `file` instead |
| `--plan-only` | print the estimate and stop; with `--publish`, write a not-run summary, but leave a summary that holds results alone |
| `--force` | with `--plan-only --publish`, replace a summary that holds results |
| `--sample <n>`, `--datasets <list>` | override the config, for dry runs |
| `--concurrency <n>` | questions run at once per job (default 8) |
| `--skip-download` | fail instead of downloading a dataset |
| `--summarize-only` | with an existing `--run-id`, rebuild `summary.json` (and with `--publish`, the app summary) from the results files. No dataset download, no provider and no model call. The config is the last repair's, or the starting one when there was none |
| `--retry-failed` | with an existing `--run-id`, run again the entries that failed, timed out, came back empty or lost their consensus; answers that succeeded are kept and not paid for again |

### Resume and cache

Results are written after every batch of questions. Running the same command again with the same `--run-id` skips the questions already answered, and the estimate shows only what is left. The reference answers are kept in a shared cache keyed by model, dataset, sample, seeds, protocol and temperature, so a later run (a new run id, or changed open models) reuses them instead of paying again.

`--retry-failed` repairs a run that hit an outage. Each failed entry is run again and replaced in place when its new result is written; until then the old entry stays in the file, so an interrupted repair loses nothing and the next one picks up where it stopped. Within an entry, a model whose answer succeeded is not called again. With `--plan-only` it prints how many entries of each dataset and job would run again, then the estimate, and makes no calls. The estimate counts the failed entries as pending. Scoring does not change: what still fails after the retries counts as wrong. The priced cost of what a repair replaced (answers not kept, consensus calls) is stored as `priorAttemptCostUsd` on the entry and summed per dataset as `retrySpendUsd`, apart from the configuration costs, which stay the cost of the results. A failed attempt reports no usage, so its tokens are not priced; `attempts` on an answer says how many calls it took.

To repair a run made before require_parameters was sent with the same routing as its kept answers, add `--no-require-parameters`.

## Results format

```
packages/eval/results/
  <run-id>/
    manifest.json                 run id, mode, status, config as run, routing, repairs, estimate, file list
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
  "mode": "free",                // "mock" for dry runs; never published to the app
  "generatedAt": "2026-11-20T10:00:00.000Z",
  "method": { "datasets": [...], "sample": 200, "questionSeed": 42, "optionSeed": 1729,
              "protocol": "structured", "temperature": 0, "confidence": 0.95,
              "models": [{ "id", "label", "spec" }], "summarizer": "qwen",
              "strategies": ["majority", "standard"], "reference": { "id", "label", "spec" } },
  "estimate": { "lowUsd": 2.18, "highUsd": 18.27, "calls": 3990 },
  "totalCostUsd": 9.41,          // cost of the results, every call once, cached reference answers included
  "totalCostIncomplete": false,  // some calls had no price: totalCostUsd is a lower bound
  "datasets": [{
    "dataset": "gsm8k", "n": 200, "bestSingleId": "single:qwen", "spentUsd": 2.3, "spentIncomplete": false,
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

The `/benchmarks` page reads the committed summary. With status `not-run` it shows "benchmarks not run yet", the estimate and this method; it never shows placeholder numbers. `matrix --mode mock` refuses to publish to the app summary. If a `mock` summary gets there anyway, the page treats it as not run, except in development, where it shows the numbers with a warning that they are not real.

## Regenerating the report

`report/generate_figures.py` reads the results format:

```bash
cd report
python3 generate_figures.py --results ../packages/eval/results/<run-id>   # or: make matrix RUN=...
make pdf
```

This writes `figures/matrix_accuracy.{pdf,png}` (accuracy per dataset and configuration with Wilson intervals), `figures/matrix_cost_accuracy.{pdf,png}` and `figures/matrix_table.tex` (the numbers with p-values). `report.tex` includes a "Benchmark matrix" subsection when `matrix_table.tex` exists. It needs only matplotlib. It refuses a mock summary unless `--allow-mock` is given, and then marks the table and figures "MOCK DATA"; never build the published report that way. `make test` runs the script's tests against `report/fixtures/matrix-summary.json`, which is mock data for the tests only. Running `generate_figures.py` with no arguments still builds the February issue-114 figures, from data that is not in the repository.

## Calibration

Two numbers in the app are assumptions until a matrix run exists. Both have a script that fits them from the run.

### Agreement labels

The app labels agreement high, medium or low from the cosine similarity of answer embeddings. Cosines sit in a narrow band that differs per embedding model, so the original cut-offs ((cosine + 1) / 2 above 0.8 is high, from 0.5 medium) make unrelated answers look like moderate agreement.

```bash
# Paths are relative to packages/eval (see "How to run it").
npm run calibrate:agreement --workspace=packages/eval -- \
  --results results/<run-id> --embedding openai:text-embedding-3-small          # prints the count and cost
npm run calibrate:agreement --workspace=packages/eval -- \
  --results results/<run-id> --embedding openai:text-embedding-3-small --yes    # embeds and fits
```

It takes every pair of answers to the same question whose final answers were both read mechanically, labels the pair agree or disagree by comparing those answers, embeds each answer with the given model (as the app would), and fits:

- `medium`: the cosine that best separates agreeing from disagreeing pairs (largest Youden J);
- `high`: the lowest cosine above which at least 90% of pairs agree (`--high-precision`), with at least 10 pairs above it;
- the ROC AUC, as a check that cosine predicts agreement at all (a warning below 0.6).

Scored pairs are cached under `<run-id>/calibration/`, so a refit costs nothing. The result is merged into `packages/app/src/data/agreement-calibration.json`, keyed by embedding model (`openai/text-embedding-3-small`, `google/gemini-embedding-2`, `ollama/nomic-embed-text`; an Ollama `:latest` tag is dropped from the key). Embedding specs: `openai:text-embedding-3-small`, `google:gemini-embedding-2`, or an endpoint and model such as `ollama:nomic-embed-text`. The app reads that file (`packages/app/src/lib/agreementCalibration.ts`): for a calibrated model it uses the fitted cut-offs and names the model; otherwise it keeps the original mapping and marks the labels "Uncalibrated". The committed file has no entries yet.

Only free-mode results are accepted. `--mode mock` (fake hash vectors, for testing the pipeline) needs an `--output` other than the app calibration, so a mock fit never reaches the app.

### Token assumptions of the cost estimate

```bash
npm run calibrate:tokens --workspace=packages/eval -- --results results/<run-id>
npm run build --workspace=packages/shared-utils
```

This makes no calls. From the recorded usage it fits the answer range (10th and 90th percentile of billed output tokens per answer or one-call synthesis, so hidden reasoning tokens are included where the provider reports them) and the consensus overhead (median synthesis input less the prompt and the answers it was given). It writes `packages/shared-utils/src/pricing/tokenCalibration.ts`, which `estimateRun` reads over the hand-set defaults in `tokenAssumptions.ts`. Verdict and critique lengths are not fitted, because the matrix runs no ELO or council consensus. The committed module is `null`, so the defaults apply. Results from a mock run are refused for the default output, because their token counts are not real; pass `--output <scratch file>` to fit them anyway.

## Run log

### 2026-11-17-m3-matrix

Started 2026-11-17 16:27 UTC, with three `--retry-failed` repairs (2026-11-17 20:26 and 22:25, 2026-11-18 13:35). The summary was rebuilt with `--summarize-only` on 2026-11-18, without calls.

- Open models: complete on all four datasets (200 questions each, 198 for GPQA). Llama 3.1 8B timed out or failed on many questions (44 of 198 on GPQA, 24 of 200 on MMLU-Pro, 12 of 200 on GSM8K); those count as wrong.
- Reference (Claude Sonnet 5.5): no usable results. On GSM8K 121 of 200 answers came back before the OpenRouter balance ran out; the other 79 got HTTP 402. MMLU-Pro got 402 on all 200. On GPQA every call was refused by the Amazon Bedrock host (`content_filter`, `refusal`); on TruthfulQA 168 got 402 and 32 were refused. The reference cache under `results/cache/free/` holds these failed entries and is not committed; a `--retry-failed` repair with credit runs them again (routing in `bench/matrix.json` now sends the reference to Anthropic only).
- The last repair (2026-11-18 13:35) stopped when the balance ran out, so `manifest.json` still says `running`. It re-ran failed entries of GSM8K, MMLU-Pro and GPQA (over all repairs, 17, 35 and 31 ensemble entries carry a `priorAttemptCostUsd`, and 86 GSM8K reference entries). Their successful model answers were kept, but the standard consensus was called again, and where that call got HTTP 402 the entry now has a failed consensus: 33 of 198 on GPQA and 4 of 200 on MMLU-Pro. Before that repair, the summary of the then-current files had GPQA standard consensus at 149 of 198 (75.3%) with 2 failures; the committed files give 121 of 198 (61.1%) with 33 failures. The published numbers are the committed files', per the method. A repair that re-runs a consensus that had succeeded can lose it; see the PR for the follow-up.
- Cost of the results: $1.56, of which $0.21 is the 121 GSM8K reference answers. Repairs replaced attempts that cost a further $0.15 (`retrySpendUsd`), $0.03 of it GSM8K reference answers. Failed attempts report no usage, so they are not priced.
- Not done, needing a paid run or embedding calls: the reference, the agreement calibration. The token calibration makes no calls and has not been run yet either.

