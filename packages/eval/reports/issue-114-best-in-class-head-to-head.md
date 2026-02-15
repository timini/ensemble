# Issue #114: Best-in-Class Ensemble vs Single Models

Date: 2026-02-15
Branch: `feat/114-sample-ensemble-vs-single`

## Model Set (one per provider)

- OpenAI: `gpt-5.2-chat-latest`
- Anthropic: `claude-opus-4-6`
- Google: `gemini-3-pro-preview`
- xAI: `grok-4-0709`

Consensus strategy: `standard`

## Sample Runs

- `gsm8k` sample: 4
- `truthfulqa` sample: 4
- Total prompts: 8

## Commands Used

```bash
npx tsx packages/eval/src/cli.ts benchmark gsm8k \
  --models openai:gpt-5.2-chat-latest anthropic:claude-opus-4-6 google:gemini-3-pro-preview xai:grok-4-0709 \
  --strategies standard \
  --sample 4 \
  --mode free \
  --output artifacts/eval/issue-114/best-in-class-gsm8k-sample4-benchmark.json

npx tsx packages/eval/src/cli.ts analyze \
  artifacts/eval/issue-114/best-in-class-gsm8k-sample4-benchmark.json \
  --report artifacts/eval/issue-114/best-in-class-gsm8k-sample4-benchmark-report.md

npx tsx packages/eval/src/cli.ts benchmark truthfulqa \
  --models openai:gpt-5.2-chat-latest anthropic:claude-opus-4-6 google:gemini-3-pro-preview xai:grok-4-0709 \
  --strategies standard \
  --sample 4 \
  --mode free \
  --output artifacts/eval/issue-114/best-in-class-truthfulqa-sample4-benchmark.json

npx tsx packages/eval/src/cli.ts analyze \
  artifacts/eval/issue-114/best-in-class-truthfulqa-sample4-benchmark.json \
  --report artifacts/eval/issue-114/best-in-class-truthfulqa-sample4-benchmark-report.md
```

## Results

### Dataset-level

#### GSM8K (n=4)

- Ensemble (`standard`): 4/4 (100.00%)
- OpenAI (`gpt-5.2-chat-latest`): 4/4 (100.00%)
- Anthropic (`claude-opus-4-6`): 4/4 (100.00%)
- Google (`gemini-3-pro-preview`): 4/4 (100.00%)
- xAI (`grok-4-0709`): 3/4 (75.00%)

#### TruthfulQA (n=4)

- Ensemble (`standard`): 3/4 (75.00%)
- OpenAI (`gpt-5.2-chat-latest`): 2/4 (50.00%)
- Anthropic (`claude-opus-4-6`): 4/4 (100.00%)
- Google (`gemini-3-pro-preview`): 3/4 (75.00%)
- xAI (`grok-4-0709`): 4/4 (100.00%)

### Combined (n=8)

- Ensemble (`standard`): 7/8 (87.50%)
- OpenAI (`gpt-5.2-chat-latest`): 6/8 (75.00%)
- Anthropic (`claude-opus-4-6`): 8/8 (100.00%)
- Google (`gemini-3-pro-preview`): 7/8 (87.50%)
- xAI (`grok-4-0709`): 7/8 (87.50%)

## Ensemble vs Each Single (combined)

- vs OpenAI: `+12.50pp` (ensemble better)
- vs Anthropic: `-12.50pp` (ensemble worse)
- vs Google: `0.00pp` (tie)
- vs xAI: `0.00pp` (tie)

## Takeaway

For this small sample, the best-in-class ensemble is competitive but not universally better:

- Beats OpenAI single model
- Ties Google and xAI single models
- Underperforms Anthropic single model on this slice

This is directional only (small `n=8`), not a final benchmark conclusion.
