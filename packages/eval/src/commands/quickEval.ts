import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
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

const DEFAULT_MODEL = 'google:gemini-3-flash-preview';
const DEFAULT_ENSEMBLE_SIZE = 3;
const DEFAULT_SAMPLE = 10;
const DEFAULT_DATASETS: BenchmarkDatasetName[] = ['gsm8k', 'truthfulqa'];
const VALID_MODES: EvalMode[] = ['mock', 'free'];

interface QuickEvalOptions {
  model: string;
  ensemble: string;
  strategies?: string[];
  datasets?: string[];
  sample: string;
  mode: string;
  cache: boolean;
  parallel: boolean;
  baseline?: string;
  significance?: string;
}

function parseDatasets(raw?: string[]): BenchmarkDatasetName[] {
  if (!raw) return DEFAULT_DATASETS;
  const names = raw.flatMap((d) => d.split(',').map((s) => s.trim()));
  return names.map((name) => {
    const resolved = resolveBenchmarkDatasetName(name);
    if (!resolved) {
      throw new Error(`Unknown dataset "${name}". Expected one of: gsm8k, truthfulqa, gpqa.`);
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
    .option('--ensemble <count>', 'Number of ensemble instances.', String(DEFAULT_ENSEMBLE_SIZE))
    .option('--strategies <strategies...>', 'Consensus strategies (standard,elo,majority,council). Comma-separated.')
    .option('--datasets <datasets...>', 'Datasets to evaluate (gsm8k,truthfulqa,gpqa). Comma-separated. Defaults to gsm8k,truthfulqa.')
    .option('--sample <count>', 'Questions per dataset.', String(DEFAULT_SAMPLE))
    .option('--mode <mode>', 'Provider mode (mock or free).', 'free')
    .option('--no-cache', 'Disable single-model baseline caching.')
    .option('--no-parallel', 'Run datasets sequentially instead of in parallel.')
    .option('--baseline <path>', 'Path to baseline JSON. Saves results and fails on regression.')
    .option('--significance <alpha>', 'Significance level for regression detection (0 < alpha < 1).', '0.10')
    .action(async (options: QuickEvalOptions) => {
      const { provider, model: modelName } = parseModelSpec(options.model);
      const model = options.model;

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

      const strategies = parseStrategies(options.strategies ?? ['standard', 'elo', 'majority', 'council']);
      const datasetNames = parseDatasets(options.datasets);
      const parallel = options.parallel;
      const useCache = options.cache && mode !== 'mock';
      const registry = new ProviderRegistry();
      registerProviders(registry, [provider], mode);

      const startTime = Date.now();
      const log = (s: string) => process.stderr.write(s);
      log(`\n  Model: ${model}  Ensemble: ${ensembleSize}x  Mode: ${mode}  Strategies: ${strategies.join(', ')}\n`);
      log(`  Datasets: ${datasetNames.join(', ')}  Sample: ${sampleCount}  Parallel: ${parallel ? 'yes' : 'no'}\n\n`);

      const datasetQuestions = await Promise.all(
        datasetNames.map(async (name) => ({
          name,
          questions: (await loadBenchmarkQuestions(name, { sample: sampleCount })).questions,
        })),
      );

      const runArgs: RunDatasetArgs[] = datasetQuestions.map(({ name, questions }) => ({
        datasetName: name, questions,
        model, provider, modelName, ensembleSize, strategies,
        mode, registry, useCache, sampleCount,
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
