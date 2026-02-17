# Issue #114 (Sample Run): Ensemble vs Single Model

Date: 2026-02-15
Branch: `feat/114-sample-ensemble-vs-single`
Scope: reduced from full Tier 1 benchmark to a quick sample comparison (per request).

## Goal

Check whether ensemble output is better than a single model using a small number of questions.

## Setup

- Mode: `free`
- Models:
  - `openai:gpt-4o`
  - `anthropic:claude-3-7-sonnet-20250219`
  - `google:gemini-2.0-flash`
  - `xai:grok-3`
- Strategies:
  - `standard`
  - `majority`
- Sample size:
  - `gsm8k`: 6 questions
  - `gpqa`: 6 questions

## Commands

```bash
# GSM8K (6 prompts)
npx tsx packages/eval/src/cli.ts benchmark gsm8k \
  --models openai:gpt-4o anthropic:claude-3-7-sonnet-20250219 google:gemini-2.0-flash xai:grok-3 \
  --strategies standard majority \
  --sample 6 \
  --mode free \
  --output artifacts/eval/issue-114/gsm8k-sample6-benchmark-v2.json

npx tsx packages/eval/src/cli.ts analyze \
  artifacts/eval/issue-114/gsm8k-sample6-benchmark-v2.json \
  --report artifacts/eval/issue-114/gsm8k-sample6-benchmark-v2-report.md

# GPQA (6 prompts)
npx tsx packages/eval/src/cli.ts benchmark gpqa \
  --models openai:gpt-4o anthropic:claude-3-7-sonnet-20250219 google:gemini-2.0-flash xai:grok-3 \
  --strategies standard majority \
  --sample 6 \
  --mode free \
  --output artifacts/eval/issue-114/gpqa-sample6-benchmark.json

npx tsx packages/eval/src/cli.ts analyze \
  artifacts/eval/issue-114/gpqa-sample6-benchmark.json \
  --report artifacts/eval/issue-114/gpqa-sample6-benchmark-report.md
```

## Results

### GSM8K (n=6)

- Best single model: `google:gemini-2.0-flash` at 6/6 (100.00%)
- Ensemble `standard`: 5/6 (83.33%)
- Ensemble `majority`: 5/6 (83.33%)

### GPQA (n=6)

- Best single model: `xai:grok-3` at 5/6 (83.33%)
- Ensemble `standard`: 5/6 (83.33%)
- Ensemble `majority`: 4/6 (66.67%)

### Combined (n=12 across both datasets)

- `standard` ensemble: 10/12 (83.33%)
- `majority` ensemble: 9/12 (75.00%)
- Best single models:
  - `google:gemini-2.0-flash`: 10/12 (83.33%)
  - `xai:grok-3`: 10/12 (83.33%)
- Other singles:
  - `anthropic:claude-3-7-sonnet-20250219`: 9/12 (75.00%)
  - `openai:gpt-4o`: 7/12 (58.33%)

## Conclusion

With this small sample, the `standard` ensemble strategy is:

- Better than weaker single models (`gpt-4o`, `claude-3-7-sonnet-20250219`)
- Comparable to the best single model overall (tie at 83.33%)
- Not consistently better than the best single model on every dataset slice

This is directional evidence only; sample size is too small for strong significance claims.
