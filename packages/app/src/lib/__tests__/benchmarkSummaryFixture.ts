/** A complete summary for tests: one dataset, the best single model and one ensemble. */
import type { BenchmarkSummary } from "../benchmarks";

export const method: BenchmarkSummary["method"] = {
  matrix: "m3-matrix",
  description:
    "Three open 7B to 14B models from different families, alone and as an ensemble, against one premium reference. Model ids and prices checked against https://openrouter.ai/api/v1/models on 2026-11-17.",
  datasets: ["gsm8k", "mmlu_pro", "gpqa", "truthfulqa"],
  sample: 200,
  questionSeed: 42,
  optionSeed: 1729,
  protocol: "structured",
  temperature: 0,
  confidence: 0.95,
  models: [
    {
      id: "qwen",
      label: "Qwen3.5 9B",
      spec: "openrouter:qwen/qwen3.5-9b",
    },
    {
      id: "llama",
      label: "Llama 3.1 8B Instruct",
      spec: "openrouter:meta-llama/llama-3.1-8b-instruct",
    },
    {
      id: "gemma",
      label: "Gemma 3 12B",
      spec: "openrouter:google/gemma-3-12b-it",
    },
  ],
  summarizer: "qwen",
  strategies: ["majority", "standard"],
  reference: {
    id: "reference",
    label: "Claude Sonnet 5.5",
    spec: "openrouter:anthropic/claude-sonnet-5.5",
  },
};

export const complete: BenchmarkSummary = {
  schemaVersion: 1,
  status: "complete",
  runId: "r1",
  mode: "free",
  generatedAt: "2026-11-20T10:00:00.000Z",
  method,
  estimate: { lowUsd: 2, highUsd: 18, calls: 3990 },
  totalCostUsd: 9.5,
  datasets: [
    {
      dataset: "gsm8k",
      n: 200,
      bestSingleId: "single:qwen",
      spentUsd: 3,
      rows: [
        {
          id: "single:qwen",
          kind: "single",
          label: "Qwen3.5 9B",
          models: [],
          n: 200,
          correct: 150,
          accuracy: 0.75,
          ciLower: 0.69,
          ciUpper: 0.8,
          failures: 0,
          vsBestSingle: null,
          costUsd: 0.1,
          costIncomplete: false,
        },
        {
          id: "ensemble:majority",
          kind: "ensemble",
          label: "Ensemble, mechanical majority",
          strategy: "majority",
          models: [],
          n: 200,
          correct: 155,
          accuracy: 0.775,
          ciLower: 0.71,
          ciUpper: 0.83,
          failures: 1,
          vsBestSingle: {
            pValue: 0.3,
            n10: 2,
            n01: 7,
            method: "exact",
            n: 200,
          },
          costUsd: 0.3,
          costIncomplete: false,
        },
      ],
    },
  ],
};
