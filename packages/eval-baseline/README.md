# eval-baseline

Reference benchmark scores using [EleutherAI's lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) for validating the Ensemble AI TypeScript eval framework.

## Purpose

Run industry-standard benchmarks with correct scoring protocols to verify that the TypeScript eval pipeline (`packages/eval`) produces comparable results. This is a calibration/validation tool, not a CI dependency.

## Setup

```bash
cd packages/eval-baseline
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Requires Python >= 3.10. Installs `lm-eval[api]`. The key can also be given as `TEST_GOOGLE_API_KEY`.

The script calls Gemini through its OpenAI-compatible endpoint (lm-eval's `local-chat-completions` model) and strips the `seed` parameter, which that endpoint rejects. Only Gemini models are supported.

## Usage

```bash
# Run all benchmarks (GSM8K, TruthfulQA, GPQA Diamond), 30 samples each,
# against gemini-3-flash-preview (the default)
GOOGLE_API_KEY=your-key python run_baseline.py

# Custom model and sample size
GOOGLE_API_KEY=your-key python run_baseline.py --model gemini-2.0-flash --limit 50

# Save results to file
GOOGLE_API_KEY=your-key python run_baseline.py --output results.json

# Run specific benchmarks only
GOOGLE_API_KEY=your-key python run_baseline.py --tasks gsm8k,gpqa
```

## Benchmarks

| Benchmark | lm-eval task | Scoring | Notes |
|-----------|-------------|---------|-------|
| GSM8K | `gsm8k_cot` | exact_match (strict + flexible) | 8-shot chain-of-thought |
| TruthfulQA | `truthfulqa_gen` | BLEURT/BLEU/ROUGE | Generative, not MC1 (chat APIs lack logprobs) |
| GPQA Diamond | `gpqa_diamond_generative_n_shot` | exact_match | Few-shot generative |

## Comparing with TypeScript eval

```bash
# 1. Run reference baseline
GOOGLE_API_KEY=... python run_baseline.py --output reference.json

# 2. Run TS eval with the same model
cd ../eval
GOOGLE_API_KEY=... node --import tsx bin/ensemble-eval.mjs quick-eval \
  --model google:gemini-3-flash-preview \
  --no-cache --sample 30 --datasets gsm8k,truthfulqa,gpqa \
  --baseline ts-results.json

# 3. Compare the single-model accuracy numbers by hand
```

Pass `--model` explicitly: the TS eval defaults to `google:gemini-2.5-flash-lite` (see `packages/eval/src/commands/quickEval.ts`), while this script defaults to `gemini-3-flash-preview`. There is no script that compares the two outputs.

Only GSM8K and GPQA are directly comparable. For TruthfulQA, lm-eval scores open-ended answers (BLEURT, BLEU, ROUGE), while the TS eval asks the MC1 question as multiple choice. The TS loader also lists the options in dataset order, so the correct answer is always option A, which inflates its TruthfulQA accuracy. The two TruthfulQA numbers should not be compared.

If the TS eval numbers are significantly different from the reference, investigate the answer extraction logic in `packages/eval/src/lib/parsers.ts`.
