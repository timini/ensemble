import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { ConcurrencyLimiter, SystemMonitor } from '../lib/concurrencyPool.js';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { resolveBenchmarkDatasetName } from '../lib/benchmarkDatasetShared.js';
import { parseStrategies } from '../lib/consensus.js';
import { parseModelSpec } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { printResults, type DatasetResult } from './quickEvalOutput.js';
import { runDataset, type RunDatasetArgs } from './quickEvalRunner.js';
import {
  buildBaselineFromResults, loadBaseline, saveBaseline,
  checkRegression, printRegressionReport,
} from './quickEvalBaseline.js';
import type { BenchmarkDatasetName, EvalMode, StrategyName } from '../types.js';

const DEFAULT_MODEL = 'google:gemini-flash-lite-latest';
const DEFAULT_JUDGE_MODEL = 'google:gemini-3-flash-preview';
const DEFAULT_ENSEMBLE_SIZE = 3;
const DEFAULT_SAMPLE = 50;
const DEFAULT_DATASETS: BenchmarkDatasetName[] = [
  'gsm8k', 'truthfulqa', 'gpqa', 'hle', 'math500',
  'mmlu_pro', 'simpleqa', 'arc', 'hellaswag', 'hallumix',
];
const VALID_MODES: EvalMode[] = ['mock', 'free'];

interface QuickEvalOptions {
  model: string;
  judgeModel: string;
  ensemble: string;
  strategies?: string[];
  datasets?: string[];
  sample: string;
  mode: string;
  cache: boolean;
  parallel: boolean;
  baseline?: string;
  significance?: string;
  concurrency: string;
}

function parseDatasets(raw?: string[]): BenchmarkDatasetName[] {
  if (!raw) return DEFAULT_DATASETS;
  const names = raw.flatMap((d) => d.split(',').map((s) => s.trim()));
  return names.map((name) => {
    const resolved = resolveBenchmarkDatasetName(name);
    if (!resolved) {
      throw new Error(`Unknown dataset "${name}". Expected one of: ${DEFAULT_DATASETS.join(', ')}.`);
    }
    return resolved;
  });
}

export function createQuickEvalCommand(): Command {
  const command = new Command('quick-eval');
  command
    .description(
      'Quick single-vs-ensemble comparison. Runs a single model instance against ' +
      'a self-ensemble to measure whether consensus strategies add value.',
    )
    .option('--model <provider:model>', 'Model to evaluate.', DEFAULT_MODEL)
    .option('--judge-model <provider:model>', 'Model for LLM judge evaluation (defaults to gemini-3-flash-preview).', DEFAULT_JUDGE_MODEL)
    .option('--ensemble <count>', 'Number of ensemble instances.', String(DEFAULT_ENSEMBLE_SIZE))
    .option('--strategies <strategies...>', 'Consensus strategies (standard,elo,majority,council). Comma-separated.')
    .option('--datasets <datasets...>', 'Datasets to evaluate. Comma-separated. Defaults to all.')
    .option('--sample <count>', 'Questions per dataset.', String(DEFAULT_SAMPLE))
    .option('--mode <mode>', 'Provider mode (mock or free).', 'free')
    .option('--no-cache', 'Disable single-model baseline caching.')
    .option('--no-parallel', 'Run datasets sequentially instead of in parallel.')
    .option('--baseline <path>', 'Path to baseline JSON. Saves results and fails on regression.')
    .option('--significance <alpha>', 'Significance level for regression detection (0 < alpha < 1).', '0.10')
    .option('--concurrency <count>', 'Initial max concurrent questions (auto-adapts via AIMD).', '100')
    .action(async (options: QuickEvalOptions) => {
      const { provider, model: modelName } = parseModelSpec(options.model);
      const model = options.model;
      const { provider: judgeProvider, model: judgeModelName } = parseModelSpec(options.judgeModel);

      const ensembleSize = Number.parseInt(options.ensemble, 10);
      if (!Number.isInteger(ensembleSize) || ensembleSize < 2) {
        throw new Error(`Ensemble size must be >= 2, got "${options.ensemble}".`);
      }

      const sampleCount = Number.parseInt(options.sample, 10);
      if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
        throw new Error(`Invalid sample count "${options.sample}".`);
      }

      const mode = options.mode as EvalMode;
      if (!VALID_MODES.includes(mode)) {
        throw new Error(`Invalid mode "${options.mode}". Expected one of: ${VALID_MODES.join(', ')}.`);
      }

      const significanceLevel = options.significance !== undefined ? Number.parseFloat(options.significance) : 0.10;
      if (Number.isNaN(significanceLevel) || significanceLevel <= 0 || significanceLevel >= 1) {
        throw new Error(`Significance level must be between 0 and 1 (exclusive), got "${options.significance}".`);
      }

      const initialConcurrency = Number.parseInt(options.concurrency, 10);
      if (!Number.isInteger(initialConcurrency) || initialConcurrency <= 0) {
        throw new Error(`Invalid concurrency "${options.concurrency}".`);
      }

      const strategies = parseStrategies(options.strategies ?? ['standard', 'elo', 'majority', 'council']);
      const datasetNames = parseDatasets(options.datasets);
      const parallel = options.parallel;
      const useCache = options.cache && mode !== 'mock';
      const registry = new ProviderRegistry();
      const providers = new Set([provider, judgeProvider]);
      registerProviders(registry, [...providers], mode);

      const monitor = new SystemMonitor();
      const limiter = new ConcurrencyLimiter({ initial: initialConcurrency, min: 5, max: 500, monitor });

      const startTime = Date.now();
      const log = (s: string) => process.stderr.write(s);
      log(`\n  Model: ${model}  Judge: ${options.judgeModel}  Ensemble: ${ensembleSize}x  Mode: ${mode}\n`);
      log(`  Strategies: ${strategies.join(', ')}  Concurrency: ${initialConcurrency} (AIMD)\n`);
      log(`  Datasets: ${datasetNames.join(', ')}  Sample: ${sampleCount}  Parallel: ${parallel ? 'yes' : 'no'}\n\n`);

      const datasetQuestions: Array<{ name: BenchmarkDatasetName; questions: import('../types.js').BenchmarkQuestion[] }> = [];
      const loadResults = await Promise.allSettled(
        datasetNames.map(async (name) => ({
          name,
          questions: (await loadBenchmarkQuestions(name, { sample: sampleCount })).questions,
        })),
      );
      for (const [i, result] of loadResults.entries()) {
        if (result.status === 'fulfilled') {
          datasetQuestions.push(result.value);
        } else {
          const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
          log(`  Warning: skipping ${datasetNames[i]} — ${reason}\n`);
        }
      }
      if (datasetQuestions.length === 0) {
        throw new Error('All datasets failed to load. Cannot proceed.');
      }

      const runArgs: RunDatasetArgs[] = datasetQuestions.map(({ name, questions }) => ({
        datasetName: name, questions,
        model, provider, modelName, ensembleSize, strategies,
        mode, registry, useCache, sampleCount,
        limiter,
        judgeProvider, judgeModelName,
      }));

      const allDatasetResults = parallel
        ? await Promise.all(runArgs.map((a) => runDataset(a, true)))
        : await runArgs.reduce<Promise<DatasetResult[]>>(
            async (acc, a) => [...(await acc), await runDataset(a, false)], Promise.resolve([]),
          );
      printResults(model, ensembleSize, strategies, allDatasetResults, Date.now() - startTime);

      if (options.baseline) {
        const current = buildBaselineFromResults(
          model, ensembleSize, sampleCount, datasetNames, strategies, allDatasetResults,
        );
        const previous = await loadBaseline(options.baseline);
        if (previous) {
          const result = checkRegression(previous, current, significanceLevel);
          printRegressionReport(result);
          if (!result.passed) {
            await saveBaseline(options.baseline, current);
            process.exitCode = 1;
            return;
          }
        } else {
          process.stdout.write('\n  No previous baseline found. Saving initial baseline.\n');
        }
        await saveBaseline(options.baseline, current);
        process.stdout.write(`  Baseline saved to ${options.baseline}\n`);
      }
    });

  return command;
}
