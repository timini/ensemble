import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { loadCachedBaseline, saveCachedBaseline } from '../lib/baselineCache.js';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { resolveBenchmarkDatasetName } from '../lib/benchmarkDatasetShared.js';
import { parseStrategies } from '../lib/consensus.js';
import { createEvaluatorForDataset } from '../lib/evaluators.js';
import { parseModelSpec } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { BenchmarkRunner } from '../lib/benchmarkRunner.js';
import { createBenchmarkFile } from './benchmarkOutput.js';
import { printResults, type DatasetResult } from './quickEvalOutput.js';
import type {
  BenchmarkDatasetName,
  BenchmarkQuestion,
  EvalMode,
  EvalProvider,
  PromptRunResult,
  StrategyName,
} from '../types.js';

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
}

interface RunDatasetArgs {
  datasetName: BenchmarkDatasetName;
  questions: BenchmarkQuestion[];
  model: string;
  provider: EvalProvider;
  modelName: string;
  ensembleSize: number;
  strategies: StrategyName[];
  mode: EvalMode;
  registry: ProviderRegistry;
  useCache: boolean;
  sampleCount: number;
}

async function runSingleBaseline(args: RunDatasetArgs): Promise<PromptRunResult[]> {
  const { datasetName, questions, model, provider, modelName, mode, registry, useCache, sampleCount } = args;

  const cached = useCache ? await loadCachedBaseline(model, datasetName, sampleCount) : null;
  if (cached) {
    process.stderr.write(`  [${datasetName}] Single (1x ${modelName}) — cached\n`);
    return cached;
  }

  process.stderr.write(`  [${datasetName}] Single (1x ${modelName})...\n`);
  const evaluator = createEvaluatorForDataset(datasetName);
  const singleModels = [{ provider, model: modelName }];
  const singleOutput = createBenchmarkFile(datasetName, mode, [model], ['standard'], questions.length);
  const runner = new BenchmarkRunner({
    mode, registry, models: singleModels, strategies: ['standard'],
    evaluator, summarizer: null, requestDelayMs: 0, parallelQuestions: true,
  });
  const result = await runner.run({
    questions, outputPath: '/dev/null', output: singleOutput,
    onProgress: (p) => {
      process.stderr.write(`  [${datasetName}] single [${p.completed}/${p.total}] ${p.questionId}\n`);
    },
  });

  if (useCache) {
    await saveCachedBaseline(model, datasetName, sampleCount, result.runs);
  }
  return result.runs;
}

async function runEnsemble(args: RunDatasetArgs): Promise<PromptRunResult[]> {
  const { datasetName, questions, model, provider, modelName, ensembleSize, strategies, mode, registry } = args;

  process.stderr.write(`  [${datasetName}] Ensemble (${ensembleSize}x ${modelName})...\n`);
  const evaluator = createEvaluatorForDataset(datasetName);
  const ensembleModels = Array.from({ length: ensembleSize }, () => ({ provider, model: modelName }));
  const ensembleOutput = createBenchmarkFile(
    datasetName, mode, Array(ensembleSize).fill(model), strategies, questions.length,
  );
  const runner = new BenchmarkRunner({
    mode, registry, models: ensembleModels, strategies, evaluator,
    summarizer: { provider, model: modelName },
    requestDelayMs: 0, parallelQuestions: true,
  });
  const result = await runner.run({
    questions, outputPath: '/dev/null', output: ensembleOutput,
    onProgress: (p) => {
      process.stderr.write(`  [${datasetName}] ensemble [${p.completed}/${p.total}] ${p.questionId}\n`);
    },
  });
  return result.runs;
}

async function runDataset(args: RunDatasetArgs, parallel: boolean): Promise<DatasetResult> {
  if (parallel) {
    const [singleRuns, ensembleRuns] = await Promise.all([
      runSingleBaseline(args),
      runEnsemble(args),
    ]);
    return { dataset: args.datasetName, singleRuns, ensembleRuns };
  }
  const singleRuns = await runSingleBaseline(args);
  const ensembleRuns = await runEnsemble(args);
  return { dataset: args.datasetName, singleRuns, ensembleRuns };
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
    .option('--strategies <strategies...>', 'Consensus strategies (standard,elo,majority). Comma-separated.')
    .option('--datasets <datasets...>', 'Datasets to evaluate (gsm8k,truthfulqa,gpqa). Comma-separated.')
    .option('--sample <count>', 'Questions per dataset.', String(DEFAULT_SAMPLE))
    .option('--mode <mode>', 'Provider mode (mock or free).', 'free')
    .option('--no-cache', 'Disable single-model baseline caching.')
    .option('--no-parallel', 'Run datasets sequentially instead of in parallel.')
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

      const strategies = parseStrategies(options.strategies ?? ['standard', 'elo', 'majority']);
      const datasetNames = parseDatasets(options.datasets);
      const parallel = options.parallel;
      const useCache = options.cache && mode !== 'mock';
      const registry = new ProviderRegistry();
      registerProviders(registry, [provider], mode);

      const startTime = Date.now();
      const log = (s: string) => process.stderr.write(s);
      log(`\n  Model: ${model}  Ensemble: ${ensembleSize}x  Strategies: ${strategies.join(', ')}\n`);
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
    });

  return command;
}
