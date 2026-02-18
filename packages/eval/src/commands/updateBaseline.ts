import { execSync } from 'node:child_process';
import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { createEvaluatorForDataset, type JudgeConfig } from '../lib/evaluators.js';
import { writeJsonFile } from '../lib/io.js';
import { registerProviders } from '../lib/providers.js';
import { pinQuestionsForBaseline } from '../lib/questionPinning.js';
import { getTierConfig } from '../lib/tierConfig.js';
import { BenchmarkRunner } from '../lib/benchmarkRunner.js';
import { createBenchmarkFile } from './benchmarkOutput.js';
import type {
  BenchmarkDatasetName,
  BenchmarkQuestion,
  EvalMode,
  StrategyName,
} from '../types.js';
import type {
  BaselineQuestionResult,
  GoldenBaselineFile,
  TierConfig,
  TierName,
} from '../lib/regressionTypes.js';

interface UpdateBaselineCommandOptions {
  tier: TierName;
  output?: string;
  mode: EvalMode;
}

/**
 * Retrieve the current git commit SHA.
 * Exported for testing purposes.
 */
export function getGitCommitSha(): string {
  return execSync('git rev-parse HEAD').toString().trim();
}

/**
 * Build a {@link GoldenBaselineFile} from benchmark run results.
 *
 * Runs the full benchmark for every dataset in the tier config,
 * evaluates all responses and consensus outputs, and assembles
 * the golden baseline structure.
 */
export async function buildGoldenBaseline(
  config: TierConfig,
  pinnedQuestions: Map<BenchmarkDatasetName, BenchmarkQuestion[]>,
  mode: EvalMode,
  commitSha: string,
): Promise<GoldenBaselineFile> {
  const registry = new ProviderRegistry();
  const providers = [
    ...config.models.map((m) => m.provider),
    config.summarizer.provider,
  ];
  registerProviders(registry, providers, mode);

  const allQuestionIds: string[] = [];
  const allResults: BaselineQuestionResult[] = [];

  const judgeConfig: JudgeConfig = {
    provider: registry.getProvider(config.summarizer.provider, mode),
    model: config.summarizer.model,
  };

  for (const { name: datasetName } of config.datasets) {
    const questions = pinnedQuestions.get(datasetName);
    if (!questions || questions.length === 0) {
      continue;
    }

    const evaluator = createEvaluatorForDataset(datasetName, judgeConfig);
    const modelStrings = config.models.map((m) => `${m.provider}:${m.model}`);

    const output = createBenchmarkFile(
      datasetName,
      mode,
      modelStrings,
      config.strategies,
      questions.length,
    );

    const runner = new BenchmarkRunner({
      mode,
      registry,
      models: config.models,
      strategies: config.strategies,
      evaluator,
      summarizer: config.summarizer,
      requestDelayMs: config.requestDelayMs,
    });

    await runner.run({
      questions,
      outputPath: '/dev/null',
      output,
      onProgress: (progress) => {
        const status = progress.skipped ? 'skipped' : 'done';
        process.stdout.write(
          `[${progress.completed}/${progress.total}] ${datasetName}/${progress.questionId} ${status}\n`,
        );
      },
    });

    for (const run of output.runs) {
      if (!run.questionId) {
        continue;
      }
      allQuestionIds.push(run.questionId);

      const modelResults: Record<string, import('../types.js').EvaluationResult> = {};
      if (run.evaluation) {
        for (const [key, result] of Object.entries(run.evaluation.results)) {
          modelResults[key] = result;
        }
      }

      const consensusResults: Partial<
        Record<StrategyName, import('../types.js').EvaluationResult>
      > = {};
      if (run.consensusEvaluation) {
        for (const [strategy, result] of Object.entries(
          run.consensusEvaluation.results,
        )) {
          if (result) {
            consensusResults[strategy as StrategyName] = result;
          }
        }
      }

      allResults.push({
        questionId: run.questionId,
        dataset: datasetName,
        groundTruth: run.groundTruth ?? '',
        modelResults,
        consensusResults,
      });
    }
  }

  return {
    tier: config.name,
    createdAt: new Date().toISOString(),
    commitSha,
    config,
    questionIds: allQuestionIds,
    results: allResults,
  };
}

/**
 * Print a human-readable summary of the generated baseline.
 */
function printSummary(baseline: GoldenBaselineFile): void {
  process.stdout.write(`\n--- Baseline Summary ---\n`);
  process.stdout.write(`Tier: ${baseline.tier}\n`);
  process.stdout.write(`Commit: ${baseline.commitSha}\n`);
  process.stdout.write(`Questions: ${baseline.questionIds.length}\n`);

  // Per-strategy accuracy
  const strategyCorrect: Record<string, number> = {};
  const strategyTotal: Record<string, number> = {};

  for (const result of baseline.results) {
    for (const [strategy, evalResult] of Object.entries(
      result.consensusResults,
    )) {
      if (!evalResult) continue;
      strategyTotal[strategy] = (strategyTotal[strategy] ?? 0) + 1;
      if (evalResult.correct) {
        strategyCorrect[strategy] = (strategyCorrect[strategy] ?? 0) + 1;
      }
    }
  }

  for (const strategy of Object.keys(strategyTotal)) {
    const correct = strategyCorrect[strategy] ?? 0;
    const total = strategyTotal[strategy] ?? 0;
    const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0';
    process.stdout.write(`Strategy "${strategy}": ${accuracy}% (${correct}/${total})\n`);
  }

  // Cost: sum from results (estimatedCostUsd is on ProviderResponse, not on baseline results)
  process.stdout.write(`Timestamp: ${baseline.createdAt}\n`);
}

export function createUpdateBaselineCommand(): Command {
  const command = new Command('update-baseline');
  command
    .description(
      'Generate a golden baseline file by running the full benchmark for a tier.',
    )
    .requiredOption(
      '--tier <tier>',
      'Evaluation tier: "ci" or "post-merge"',
    )
    .option(
      '--output <path>',
      'Path to write the baseline JSON file',
    )
    .option('--mode <mode>', 'Provider mode to use (mock or free)', 'free')
    .action(async (options: UpdateBaselineCommandOptions) => {
      const config = getTierConfig(options.tier);
      const outputPath =
        options.output ?? `baselines/golden-${options.tier}.json`;
      const mode = options.mode;

      process.stdout.write(
        `Generating golden baseline for tier "${config.name}" (mode: ${mode})...\n`,
      );

      const pinnedQuestions = await pinQuestionsForBaseline(config);
      const commitSha = getGitCommitSha();
      const baseline = await buildGoldenBaseline(
        config,
        pinnedQuestions,
        mode,
        commitSha,
      );

      await writeJsonFile(outputPath, baseline);
      process.stdout.write(`Baseline written to ${outputPath}\n`);
      printSummary(baseline);
    });

  return command;
}
