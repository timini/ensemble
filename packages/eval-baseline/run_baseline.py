#!/usr/bin/env python3
"""
Run lm-evaluation-harness benchmarks against a Gemini model and output
results as JSON for comparison with the Ensemble AI TypeScript eval framework.

Usage:
    # Install (one-time):
    cd packages/eval-baseline
    pip install -e .

    # Run all benchmarks (30 samples each):
    GOOGLE_API_KEY=... python run_baseline.py

    # Custom model / sample size:
    GOOGLE_API_KEY=... python run_baseline.py --model gemini-2.0-flash --limit 50

    # Output to file:
    GOOGLE_API_KEY=... python run_baseline.py --output results.json
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone


# Gemini's OpenAI-compatible endpoint
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions"

# Tasks that work with chat-completions (generate_until only, no logprobs)
TASKS = {
    "gsm8k": "gsm8k_cot",
    "truthfulqa": "truthfulqa_gen",
    "gpqa": "gpqa_diamond_generative_n_shot",
}


def _patch_gemini_compat():
    """
    Patch LocalChatCompletion to remove 'seed' from the payload.
    Gemini's OpenAI-compatible endpoint rejects the 'seed' parameter.
    """
    from lm_eval.models.openai_completions import LocalChatCompletion  # type: ignore[import-untyped]

    _original_create_payload = LocalChatCompletion._create_payload

    def _patched_create_payload(self, *args, **kwargs):
        payload = _original_create_payload(self, *args, **kwargs)
        payload.pop("seed", None)
        return payload

    LocalChatCompletion._create_payload = _patched_create_payload


def run_eval(model: str, limit: int, tasks: list[str]) -> dict:
    """Run lm-evaluation-harness and return the results dict."""
    import lm_eval  # type: ignore[import-untyped]

    _patch_gemini_compat()

    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("TEST_GOOGLE_API_KEY")
    if not api_key:
        print("Error: Set GOOGLE_API_KEY or TEST_GOOGLE_API_KEY", file=sys.stderr)
        sys.exit(1)

    # lm-eval reads OPENAI_API_KEY for the openai-compatible client
    os.environ["OPENAI_API_KEY"] = api_key

    task_names = [TASKS[t] for t in tasks]

    print(f"Running lm-evaluation-harness", file=sys.stderr)
    print(f"  Model: {model}", file=sys.stderr)
    print(f"  Tasks: {', '.join(task_names)}", file=sys.stderr)
    print(f"  Limit: {limit} samples per task", file=sys.stderr)
    print(file=sys.stderr)

    results = lm_eval.simple_evaluate(
        model="local-chat-completions",
        model_args=f"model={model},base_url={GEMINI_BASE_URL},num_concurrent=1,max_retries=3",
        tasks=task_names,
        limit=limit,
        log_samples=False,
        apply_chat_template=True,
    )

    return results


def extract_scores(results: dict, tasks: list[str]) -> dict:
    """Extract accuracy scores from lm-eval results into a simple format."""
    scores = {}
    task_results = results.get("results", {})

    for our_name in tasks:
        lm_eval_name = TASKS[our_name]
        task_data = task_results.get(lm_eval_name, {})

        if our_name == "gsm8k":
            # GSM8K CoT reports exact_match with strict and flexible filters
            strict = task_data.get("exact_match,strict-match")
            flexible = task_data.get("exact_match,flexible-extract")
            scores[our_name] = {
                "exact_match_strict": strict,
                "exact_match_flexible": flexible,
                "metric": "exact_match",
            }
        elif our_name == "truthfulqa":
            # truthfulqa_gen reports BLEURT/BLEU/ROUGE metrics
            scores[our_name] = {
                k: v for k, v in task_data.items()
                if not k.startswith("alias")
            }
            scores[our_name]["metric"] = "truthfulqa_gen (generative, not MC1)"
        elif our_name == "gpqa":
            exact = task_data.get("exact_match,flexible-extract") or task_data.get("exact_match,none")
            scores[our_name] = {
                "exact_match": exact,
                "metric": "exact_match",
            }

    return scores


def main():
    parser = argparse.ArgumentParser(
        description="Run lm-evaluation-harness reference benchmarks for Ensemble AI eval validation"
    )
    parser.add_argument(
        "--model", default="gemini-3-flash-preview",
        help="Gemini model ID (default: gemini-3-flash-preview)"
    )
    parser.add_argument(
        "--limit", type=int, default=30,
        help="Number of samples per benchmark (default: 30)"
    )
    parser.add_argument(
        "--tasks", default="gsm8k,truthfulqa,gpqa",
        help="Comma-separated list of benchmarks (default: gsm8k,truthfulqa,gpqa)"
    )
    parser.add_argument(
        "--output", "-o", default=None,
        help="Output JSON file path (default: stdout)"
    )
    args = parser.parse_args()

    tasks = [t.strip() for t in args.tasks.split(",")]
    for t in tasks:
        if t not in TASKS:
            print(f"Error: Unknown task '{t}'. Available: {', '.join(TASKS.keys())}", file=sys.stderr)
            sys.exit(1)

    results = run_eval(args.model, args.limit, tasks)
    scores = extract_scores(results, tasks)

    output = {
        "framework": "lm-evaluation-harness",
        "model": args.model,
        "limit": args.limit,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scores": scores,
        "note": "Reference scores for validating Ensemble AI TypeScript eval framework. "
                "TruthfulQA uses generative scoring (not MC1 log-prob) since chat-completions "
                "APIs do not expose logprobs.",
    }

    json_str = json.dumps(output, indent=2)

    if args.output:
        with open(args.output, "w") as f:
            f.write(json_str + "\n")
        print(f"Results written to {args.output}", file=sys.stderr)
    else:
        print(json_str)


if __name__ == "__main__":
    main()
