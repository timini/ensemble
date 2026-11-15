# Implementation Plan: Proof of Value — Ensemble Evaluation Framework

**Feature Branch**: `feat/proof-of-value`
**Created**: 2026-02-13

## Architecture Overview

This feature has three workstreams that can be partially parallelised:

```
Workstream A: Majority Voting (UI + Engine)
  └─ Add strategy to shared-utils → Update Zustand → Update UI → Tests

Workstream B: Evaluation CLI (packages/eval/)
  └─ Package setup → Dataset loaders → EnsembleRunner → BenchmarkRunner → CLI

Workstream C: Analysis & Reporting
  └─ Statistical analysis → Report generation → Visualisation data
```

### Dependency Graph

```
A1 (MajorityVoting strategy) ──┬──→ A2 (Zustand types) → A3 (UI component) → A4 (hook wiring)
                               │
                               └──→ B4 (BenchmarkRunner uses all strategies)

B1 (eval package setup) → B2 (dataset loaders) → B3 (EnsembleRunner) → B4 (BenchmarkRunner) → B5 (CLI)

B4 (BenchmarkRunner) → C1 (statistical analysis) → C2 (report generation)
```

## Workstream A: Majority Voting

### A1. MajorityVotingConsensus Strategy

**Location**: `packages/shared-utils/src/consensus/MajorityVotingConsensus.ts`

Implements `ConsensusStrategy` interface. Uses the summarizer LLM to:
1. Analyse all responses and identify the majority position
2. Rank responses by alignment with the majority
3. Synthesise a consensus answer weighted toward the majority

```typescript
export class MajorityVotingConsensus implements ConsensusStrategy {
  constructor(
    private summarizerProvider: AIProvider,
    private summarizerModelId: string
  ) {}

  async rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]> {
    // Use LLM to identify majority position and rank each response
    // by alignment with it. Return rankings with scores 0-100.
  }

  async generateConsensus(responses: ConsensusModelResponse[], topN: number, prompt: string): Promise<string> {
    // 1. Call rankResponses() to identify majority position
    // 2. Synthesise answer emphasising majority-agreed content
    // Uses a specific prompt that asks the LLM to:
    //   - Identify which points most responses agree on
    //   - Weight the synthesis toward majority-agreed content
    //   - Note any significant minority positions
  }
}
```

### A2. Zustand Type Updates

**Location**: `packages/app/src/store/slices/ensembleSlice.ts`

- Change type from `'standard' | 'elo'` to `'standard' | 'elo' | 'majority'`
- Update `SavedEnsemble` interface
- No new state fields needed

### A3. UI Component Update

**Location**: `packages/component-library/src/components/organisms/EnsembleConfigurationSummary/`

- Add third radio button: "Majority Voting"
- Majority Voting works with 2+ models (no minimum like ELO's 3)
- Add brief description for each method

### A4. Hook Wiring

**Location**: `packages/app/src/app/review/hooks/useConsensusGeneration.ts`

- Add `else if (consensusMethod === "majority")` branch
- Instantiate `MajorityVotingConsensus` with summarizer provider

## Workstream B: Evaluation CLI

### B1. Package Setup

**Location**: `packages/eval/`

```
packages/eval/
├── src/
│   ├── cli.ts                    # CLI entry point (commander.js)
│   ├── runner/
│   │   ├── EnsembleRunner.ts     # Orchestrate parallel model queries
│   │   ├── BenchmarkRunner.ts    # Run full benchmark suites
│   │   └── ResultCollector.ts    # Collect & serialise results
│   ├── benchmarks/
│   │   ├── types.ts              # Benchmark interfaces
│   │   ├── GSM8KLoader.ts        # Load & parse GSM8K
│   │   ├── TruthfulQALoader.ts   # Load & parse TruthfulQA
│   │   ├── GPQALoader.ts         # Load & parse GPQA Diamond
│   │   └── evaluators/
│   │       ├── NumericEvaluator.ts    # GSM8K answer checking
│   │       ├── MCQEvaluator.ts        # Multiple choice checking
│   │       └── GenerativeEvaluator.ts # LLM-as-judge for open-ended
│   ├── strategies/
│   │   └── SelfConsistency.ts    # Sample same model N times + vote
│   ├── analysis/
│   │   ├── statistics.ts         # McNemar's, bootstrap, CIs
│   │   ├── report.ts             # Markdown report generation
│   │   └── chartData.ts          # JSON for visualisations
│   └── config.ts                 # API key loading, model configs
├── results/                      # Output directory (gitignored)
├── package.json
└── tsconfig.json
```

**Dependencies**: commander, @ensemble-ai/shared-utils
**Dev dependencies**: vitest, typescript

### B2. Dataset Loaders

Each loader implements:
```typescript
interface BenchmarkLoader {
  name: string;
  load(options?: { sample?: number }): Promise<BenchmarkQuestion[]>;
}

interface BenchmarkQuestion {
  id: string;
  prompt: string;
  groundTruth: string;
  category?: string;
  difficulty?: string;
  metadata?: Record<string, unknown>;
}
```

- **GSM8K**: Download from HuggingFace datasets API, parse `question` and extract numeric answer from `answer` field (after `####`)
- **TruthfulQA**: Download MC1/MC2 format, use `best_answer` as ground truth
- **GPQA Diamond**: Download from HuggingFace, parse question + correct answer letter

### B3. EnsembleRunner

Orchestrates running a single prompt through multiple models:

```typescript
class EnsembleRunner {
  constructor(private registry: ProviderRegistry, private mode: ProviderMode) {}

  async run(prompt: string, models: ModelSpec[]): Promise<EnsembleResult> {
    // 1. Query all models in parallel (reuse shared-utils provider clients)
    // 2. Collect responses with timing and token counts
    // 3. Return structured result
  }
}
```

### B4. BenchmarkRunner

Orchestrates running a full benchmark suite:

```typescript
class BenchmarkRunner {
  async run(config: BenchmarkConfig): Promise<BenchmarkRun> {
    // For each question:
    //   1. Run EnsembleRunner to get all individual responses
    //   2. Run each consensus strategy on the responses
    //   3. Evaluate each answer against ground truth
    //   4. Collect results
    // Save complete JSON results
    // Support resuming interrupted runs
    // Show progress bar
  }
}
```

### B5. CLI Entry Point

```bash
# Run a benchmark
ensemble-eval benchmark gsm8k \
  --models gpt-4o,claude-3-5-sonnet,gemini-1.5-pro,grok-2 \
  --strategies majority,standard,elo \
  --sample 200 \
  --output results/gsm8k-run-1.json

# Run self-consistency baseline
ensemble-eval baseline gsm8k \
  --model gpt-4o \
  --samples 4 \
  --sample 200

# Analyse results
ensemble-eval analyze results/gsm8k-run-1.json \
  --report results/gsm8k-report.md

# Quick single-prompt test
ensemble-eval run "What is 15% of 240?" \
  --models gpt-4o,claude-3-5-sonnet \
  --strategy majority
```

## Workstream C: Analysis & Reporting

### C1. Statistical Analysis

**McNemar's Test**: For each (strategy, model) pair on the same questions:
- Build 2x2 contingency table (both correct, only strategy correct, only model correct, both wrong)
- Compute chi-squared statistic and p-value

**Paired Bootstrap**:
- Resample questions with replacement (10,000 iterations)
- Compute accuracy delta for each resample
- Report 95% CI

**Agreement Calibration**:
- Group questions by agreement level (N/M models agree)
- Compute ensemble accuracy at each agreement level
- This becomes a confidence signal: "when all 4 models agree, accuracy is X%"

### C2. Report Generation

Markdown report including:
- Summary table: model accuracy vs. strategy accuracy
- Statistical significance tests
- Per-category/difficulty breakdown
- Notable examples (questions where ensemble succeeded but individuals failed)
- Cost analysis (tokens used, estimated cost)

### C3. Chart Data

JSON files for generating visualisations:
- Accuracy lift by difficulty
- Agreement-as-confidence calibration curve
- Model diversity heatmap
- Cost vs. accuracy frontier

## Technical Decisions

1. **Reuse shared-utils providers as-is** — no modifications needed
2. **No database for eval** — JSON files are sufficient for benchmark results
3. **Commander.js for CLI** — lightweight, well-known
4. **HuggingFace datasets API** — download datasets via HTTP, cache locally
5. **Resumable runs** — save intermediate results so interrupted benchmarks can continue
6. **Rate limiting** — configurable delay between API calls to avoid rate limits
