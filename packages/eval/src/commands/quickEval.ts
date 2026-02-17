import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { loadCachedBaseline, saveCachedBaseline } from '../lib/baselineCache.js';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { parseStrategies } from '../lib/consensus.js';
import { createEvaluatorForDataset } from '../lib/evaluators.js';
import { registerProviders } from '../lib/providers.js';
import { BenchmarkRunner } from '../lib/benchmarkRunner.js';
import { computeEnsembleDelta } from '../lib/regression.js';
import { createBenchmarkFile } from './benchmarkOutput.js';
import type {
  BenchmarkDatasetName,
  EvalMode,
  PromptRunResult,
  StrategyName,
} from '../types.js';

const DEFAULT_MODEL = 'google:gemini-2.0-flash';
const DEFAULT_ENSEMBLE_SIZE = 3;
const DEFAULT_SAMPLE = 10;
const DEFAULT_DATASETS: BenchmarkDatasetName[] = ['gsm8k', 'truthfulqa'];

interface QuickEvalOptions {
  model: string;
  ensemble: string;
  strategies?: string[];
  datasets?: string[];
  sample: string;
  mode: EvalMode;
  cache: boolean;
}

interface DatasetResult {
  dataset: string;
  singleRuns: PromptRunResult[];
  ensembleRuns: PromptRunResult[];
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function toDelta(value: number): string {
  const pct = (value * 100).toFixed(1);
  if (value > 0) return `+${pct}%`;
  return `${pct}%`;
}

function sumTokens(runs: PromptRunResult[]): number {
  let total = 0;
  for (const run of runs) {
    for (const r of run.responses) {
      if (!r.error) total += r.tokenCount ?? 0;
    }
    // Count consensus tokens (from the consensus output sizes as proxy)
    // The actual token count is already in response tokenCount
  }
  return total;
}

function sumCost(runs: PromptRunResult[]): number {
  let total = 0;
  for (const run of runs) {
    for (const r of run.responses) {
      if (!r.error) total += r.estimatedCostUsd ?? 0;
    }
  }
  return total;
}

function computeAccuracy(runs: PromptRunResult[], strategy?: StrategyName): {
  correct: number;
  total: number;
  accuracy: number;
} {
  let correct = 0;
  let total = 0;
  if (strategy) {
    for (const run of runs) {
      const result = run.consensusEvaluation?.results?.[strategy];
      if (result) {
        total += 1;
        if (result.correct) correct += 1;
      }
    }
  } else {
    // Per-model accuracy (use evaluation results)
    for (const run of runs) {
      if (!run.evaluation?.results) continue;
      for (const result of Object.values(run.evaluation.results)) {
        total += 1;
        if (result.correct) correct += 1;
      }
    }
  }
  return { correct, total, accuracy: total > 0 ? correct / total : 0 };
}

export function createQuickEvalCommand(): Command {
  const command = new Command('quick-eval');
  command
    .description(
      'Quick single-vs-ensemble comparison. Runs a single model instance against ' +
      'a self-ensemble to measure whether consensus strategies add value.',
    )
    .option(
      '--model <provider:model>',
      'Model to evaluate.',
      DEFAULT_MODEL,
    )
    .option(
      '--ensemble <count>',
      'Number of ensemble instances.',
      String(DEFAULT_ENSEMBLE_SIZE),
    )
    .option(
      '--strategies <strategies...>',
      'Consensus strategies to test (standard, elo, majority). Comma-separated.',
    )
    .option(
      '--datasets <datasets...>',
      'Datasets to evaluate (gsm8k, truthfulqa, gpqa). Comma-separated.',
    )
    .option('--sample <count>', 'Questions per dataset.', String(DEFAULT_SAMPLE))
    .option('--mode <mode>', 'Provider mode (mock or free).', 'free')
    .option('--no-cache', 'Disable single-model baseline caching (re-run baseline from scratch).')
    .action(async (options: QuickEvalOptions) => {
      const model = options.model;
      const [provider, modelName] = model.split(':');
      if (!provider || !modelName) {
        throw new Error(`Invalid model spec "${model}". Expected provider:model format.`);
      }

      const ensembleSize = Number.parseInt(options.ensemble, 10);
      if (!Number.isInteger(ensembleSize) || ensembleSize < 2) {
        throw new Error(`Ensemble size must be >= 2, got "${options.ensemble}".`);
      }

      const sampleCount = Number.parseInt(options.sample, 10);
      if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
        throw new Error(`Invalid sample count "${options.sample}".`);
      }

      const strategies = parseStrategies(options.strategies ?? ['standard', 'elo', 'majority']);
      const datasetNames: BenchmarkDatasetName[] = options.datasets
        ? (options.datasets.flatMap((d) => d.split(',').map((s) => s.trim())) as BenchmarkDatasetName[])
        : DEFAULT_DATASETS;

      const mode = options.mode;
      const requestDelayMs = mode === 'mock' ? 0 : 100;
      const registry = new ProviderRegistry();
      registerProviders(registry, [provider as import('../types.js').EvalProvider], mode);

      const startTime = Date.now();

      process.stderr.write(`\n  Model:    ${model}\n`);
      process.stderr.write(`  Ensemble: ${ensembleSize}x ${model}\n`);
      process.stderr.write(`  Strategy: ${strategies.join(', ')}\n`);
      process.stderr.write(`  Datasets: ${datasetNames.join(', ')}\n`);
      process.stderr.write(`  Sample:   ${sampleCount} per dataset\n\n`);

      const allDatasetResults: DatasetResult[] = [];

      for (const datasetName of datasetNames) {
        process.stderr.write(`--- ${datasetName} ---\n`);

        const { questions } = await loadBenchmarkQuestions(datasetName, {
          sample: sampleCount,
        });

        const evaluator = createEvaluatorForDataset(datasetName);

        // Run 1: Single instance (check cache first)
        let singleRuns: PromptRunResult[];
        const useCache = options.cache && mode !== 'mock';
        const cached = useCache
          ? await loadCachedBaseline(model, datasetName, sampleCount)
          : null;

        if (cached) {
          process.stderr.write(`  Single instance (1x ${modelName}) — cached\n`);
          singleRuns = cached;
        } else {
          process.stderr.write(`  Single instance (1x ${modelName})...\n`);
          const singleModels = [{ provider: provider as import('../types.js').EvalProvider, model: modelName }];
          const singleOutput = createBenchmarkFile(
            datasetName, mode, [model], ['standard'], questions.length,
          );
          const singleRunner = new BenchmarkRunner({
            mode,
            registry,
            models: singleModels,
            strategies: ['standard'],
            evaluator,
            summarizer: null,
            requestDelayMs,
          });
          const singleResult = await singleRunner.run({
            questions,
            outputPath: '/dev/null',
            output: singleOutput,
            onProgress: (p) => {
              process.stderr.write(`    [${p.completed}/${p.total}] ${p.questionId}\n`);
            },
          });
          singleRuns = singleResult.runs;

          if (useCache) {
            await saveCachedBaseline(model, datasetName, sampleCount, singleRuns);
          }
        }

        // Run 2: Ensemble (N instances of the same model)
        process.stderr.write(`  Ensemble (${ensembleSize}x ${modelName})...\n`);
        const ensembleModels = Array.from({ length: ensembleSize }, () => ({
          provider: provider as import('../types.js').EvalProvider,
          model: modelName,
        }));
        const ensembleOutput = createBenchmarkFile(
          datasetName, mode, Array(ensembleSize).fill(model), strategies, questions.length,
        );
        const ensembleRunner = new BenchmarkRunner({
          mode,
          registry,
          models: ensembleModels,
          strategies,
          evaluator,
          summarizer: { provider: provider as import('../types.js').EvalProvider, model: modelName },
          requestDelayMs,
        });
        const ensembleResult = await ensembleRunner.run({
          questions,
          outputPath: '/dev/null',
          output: ensembleOutput,
          onProgress: (p) => {
            process.stderr.write(`    [${p.completed}/${p.total}] ${p.questionId}\n`);
          },
        });

        allDatasetResults.push({
          dataset: datasetName,
          singleRuns,
          ensembleRuns: ensembleResult.runs,
        });
      }

      const durationMs = Date.now() - startTime;

      // Print results
      const allSingleRuns = allDatasetResults.flatMap((d) => d.singleRuns);
      const allEnsembleRuns = allDatasetResults.flatMap((d) => d.ensembleRuns);

      const singleAcc = computeAccuracy(allSingleRuns);
      const singleTokens = sumTokens(allSingleRuns);
      const singleCost = sumCost(allSingleRuns);

      process.stdout.write(`\n${'='.repeat(70)}\n`);
      process.stdout.write(`  QUICK EVAL RESULTS — ${model}\n`);
      process.stdout.write(`${'='.repeat(70)}\n\n`);

      // Per-dataset breakdown
      for (const dr of allDatasetResults) {
        const dsSingle = computeAccuracy(dr.singleRuns);
        const dsSingleTokens = sumTokens(dr.singleRuns);
        process.stdout.write(`  ${dr.dataset}:\n`);
        process.stdout.write(`    Single:   ${toPercent(dsSingle.accuracy)} (${dsSingle.correct}/${dsSingle.total})  tokens: ${dsSingleTokens.toLocaleString()}\n`);
        for (const strategy of strategies) {
          const dsStrat = computeAccuracy(dr.ensembleRuns, strategy);
          const dsTokens = sumTokens(dr.ensembleRuns);
          const delta = dsStrat.accuracy - dsSingle.accuracy;
          const tokenDelta = dsTokens - dsSingleTokens;
          process.stdout.write(`    ${strategy.padEnd(10)} ${toPercent(dsStrat.accuracy)} (${dsStrat.correct}/${dsStrat.total})  delta: ${toDelta(delta)}  tokens: ${dsTokens.toLocaleString()} (${tokenDelta > 0 ? '+' : ''}${tokenDelta.toLocaleString()})\n`);
        }
        process.stdout.write('\n');
      }

      // Summary section — the key numbers at a glance
      process.stdout.write(`  ${'—'.repeat(60)}\n`);
      process.stdout.write(`  SUMMARY\n`);
      process.stdout.write(`  ${'—'.repeat(60)}\n\n`);

      process.stdout.write(`  ${''.padEnd(14)} ${'Accuracy'.padEnd(22)} ${'Tokens'.padEnd(16)} Cost\n`);
      process.stdout.write(`  ${'Single (1x)'.padEnd(14)} ${`${toPercent(singleAcc.accuracy)} (${singleAcc.correct}/${singleAcc.total})`.padEnd(22)} ${singleTokens.toLocaleString().padEnd(16)} $${singleCost.toFixed(4)}\n`);

      for (const strategy of strategies) {
        const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
        const stratTokens = sumTokens(allEnsembleRuns);
        const stratCost = sumCost(allEnsembleRuns);

        process.stdout.write(`  ${`${strategy} (${ensembleSize}x)`.padEnd(14)} ${`${toPercent(stratAcc.accuracy)} (${stratAcc.correct}/${stratAcc.total})`.padEnd(22)} ${stratTokens.toLocaleString().padEnd(16)} $${stratCost.toFixed(4)}\n`);
      }

      process.stdout.write('\n');

      // Delta highlights
      for (const strategy of strategies) {
        const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
        const stratTokens = sumTokens(allEnsembleRuns);
        const stratCost = sumCost(allEnsembleRuns);
        const accDelta = stratAcc.accuracy - singleAcc.accuracy;
        const tokenDelta = stratTokens - singleTokens;
        const costDelta = stratCost - singleCost;
        const tokenMultiplier = singleTokens > 0 ? stratTokens / singleTokens : 0;

        const accIcon = accDelta > 0 ? ' ✓' : accDelta < 0 ? ' ✗' : '';

        process.stdout.write(`  ${strategy} vs single:\n`);
        process.stdout.write(`    Accuracy: ${toDelta(accDelta)}${accIcon}\n`);
        process.stdout.write(`    Tokens:   ${tokenDelta > 0 ? '+' : ''}${tokenDelta.toLocaleString()} (${tokenMultiplier.toFixed(1)}x)\n`);
        process.stdout.write(`    Cost:     ${costDelta >= 0 ? '+' : ''}$${costDelta.toFixed(4)} (${tokenMultiplier.toFixed(1)}x)\n`);
      }

      process.stdout.write(`\n  Duration: ${Math.round(durationMs / 1000)}s\n`);
      process.stdout.write(`${'='.repeat(70)}\n`);
    });

  return command;
}
