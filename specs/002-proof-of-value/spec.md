# Feature Specification: Proof of Value — Ensemble Evaluation Framework

**Feature Branch**: `feat/proof-of-value`
**Created**: 2026-02-13
**Status**: Draft

## Overview

Build an evaluation framework to prove that querying multiple LLMs and synthesizing their responses produces better answers than any single model. This includes a CLI-based benchmark runner, a new Majority Voting consensus strategy (UI + engine), and result storage for analysis.

The output is quantitative evidence suitable for a blog post or paper demonstrating ensemble value.

## User Scenarios & Testing

### Primary User Story — Benchmark Operator

The developer (you) runs benchmarks against standard datasets (GSM8K, TruthfulQA, GPQA Diamond) using multiple models and multiple consensus strategies, then analyses the results to produce evidence that ensembles outperform individual models.

### Secondary User Story — App User selects Majority Voting

A user of the Ensemble AI web app selects "Majority Voting" as their consensus method on the prompt page. The system collects all model responses, uses an LLM to identify the majority position, and synthesises a consensus answer weighted toward the most-agreed-upon answer.

### Acceptance Scenarios

1. **Given** a GSM8K dataset is loaded, **When** the benchmark runner executes with 4 models and 3 strategies, **Then** results are saved as JSON with per-question accuracy for each model and each strategy.
2. **Given** benchmark results exist, **When** the analysis command runs, **Then** it produces accuracy comparisons, McNemar's test p-values, and a markdown report.
3. **Given** a user selects "Majority Voting" on the prompt page, **When** responses complete, **Then** the consensus card shows a synthesis weighted toward the majority answer.
4. **Given** fewer than 2 models are selected, **When** the user tries to select Majority Voting, **Then** it is disabled with an explanation.

## Requirements

### Functional Requirements — Majority Voting (UI)

- **FR-001**: System MUST provide a "Majority Voting" consensus strategy alongside Standard and ELO
- **FR-002**: Majority Voting MUST use an LLM to identify which response represents the majority position among all responses
- **FR-003**: Majority Voting MUST synthesise a final answer weighted toward the majority-agreed position
- **FR-004**: Majority Voting MUST be selectable via the EnsembleConfigurationSummary component
- **FR-005**: Majority Voting MUST work with 2 or more model responses
- **FR-006**: Majority Voting rankings MUST assign higher scores to responses closest to the majority position

### Functional Requirements — Evaluation CLI

- **FR-010**: System MUST provide a CLI tool (`packages/eval/`) that runs ensemble benchmarks
- **FR-011**: CLI MUST load benchmark datasets from HuggingFace (GSM8K, TruthfulQA, GPQA Diamond)
- **FR-012**: CLI MUST query multiple models in parallel and collect full responses
- **FR-013**: CLI MUST run multiple consensus strategies (majority voting, standard, ELO) on the same responses
- **FR-014**: CLI MUST evaluate answers against ground truth and compute accuracy
- **FR-015**: CLI MUST support a self-consistency baseline (sampling same model N times)
- **FR-016**: CLI MUST save complete results as JSON (individual responses, consensus outputs, accuracy, timing, cost)
- **FR-017**: CLI MUST support sampling (e.g., --sample 200) for quick iteration
- **FR-018**: CLI MUST read API keys from environment variables

### Functional Requirements — Analysis & Reporting

- **FR-020**: System MUST compute per-model accuracy and per-strategy ensemble accuracy
- **FR-021**: System MUST compute McNemar's test for paired accuracy comparison
- **FR-022**: System MUST compute confidence intervals via paired bootstrap resampling
- **FR-023**: System MUST generate a markdown report with summary tables
- **FR-024**: System MUST produce chart-ready JSON data for key visualisations
- **FR-025**: System MUST support accuracy-by-difficulty stratification
- **FR-026**: System MUST compute agreement-as-confidence calibration (accuracy when N/M models agree)

### Key Entities

- **BenchmarkRun**: A complete execution of one benchmark dataset with specific models and strategies
- **QuestionResult**: Per-question data including all individual responses, consensus outputs, and correctness
- **AccuracySummary**: Aggregated accuracy metrics per model and per strategy
- **StatisticalTest**: McNemar's test result, confidence intervals, p-values

## Benchmarks

### Tier 1 (Must-do)

| Benchmark | Size | Format | Ground Truth |
|-----------|------|--------|-------------|
| GSM8K | 1,319 test | Free-form math | Numeric answer |
| TruthfulQA | 817 | MCQ + generation | Best/correct answer |
| GPQA Diamond | 198 | MCQ | Letter answer |

### Tier 2 (Stretch)

| Benchmark | Size | Format | Ground Truth |
|-----------|------|--------|-------------|
| MMLU-Pro | ~12,000 | 10-choice MCQ | Letter answer |
| HumanEval | 164 | Code generation | Test cases |

### Models

Primary ensemble: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Grok-2

### Strategies to Compare

1. Individual model (baseline)
2. Self-consistency (same model sampled N times) (baseline)
3. Majority Voting
4. Standard Consensus (synthesis)
5. ELO Ranking Consensus

## Key Academic References

- Mixture-of-Agents (ICLR 2025) — 7.6% improvement over GPT-4o
- Iterative Consensus Ensemble (2025) — 23% accuracy gain
- ReConcile (ACL 2024) — 11.4% improvement
- Multiagent Debate (ICML 2024) — 8 point GSM8K gain
- Self-MoA (2025) — counter-evidence to address
- Harnessing Multiple LLMs: Survey (2025) — comprehensive taxonomy

## Estimated Cost

~$100-300 for full benchmark runs across all Tier 1 datasets with 4 models.
