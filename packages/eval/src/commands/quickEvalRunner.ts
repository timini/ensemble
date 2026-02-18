import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { loadCachedBaseline, saveCachedBaseline } from '../lib/baselineCache.js';
import { createEvaluatorForDataset, type JudgeConfig } from '../lib/evaluators.js';
import { BenchmarkRunner } from '../lib/benchmarkRunner.js';
import { createBenchmarkFile } from './benchmarkOutput.js';
import type { DatasetResult } from './quickEvalOutput.js';
import type {
  BenchmarkDatasetName,
  BenchmarkQuestion,
  EvalMode,
  EvalProvider,
  PromptRunResult,
  StrategyName,
} from '../types.js';

export interface RunDatasetArgs {
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

function buildJudgeConfig(args: RunDatasetArgs): JudgeConfig | undefined {
  try {
    return {
      provider: args.registry.getProvider(args.provider, args.mode),
      model: args.modelName,
    };
  } catch (error) {
    process.stderr.write(
      `Warning: judge provider unavailable (${error instanceof Error ? error.message : String(error)})\n`,
    );
    return undefined;
  }
}

async function runSingleBaseline(args: RunDatasetArgs): Promise<PromptRunResult[]> {
  const { datasetName, questions, model, provider, modelName, mode, registry, useCache, sampleCount } = args;

  const cached = useCache ? await loadCachedBaseline(model, datasetName, sampleCount) : null;
  if (cached) {
    process.stderr.write(`  [${datasetName}] Single (1x ${modelName}) — cached\n`);
    return cached;
  }

  process.stderr.write(`  [${datasetName}] Single (1x ${modelName})...\n`);
  const evaluator = createEvaluatorForDataset(datasetName, buildJudgeConfig(args));
  const singleModels = [{ provider, model: modelName }];
  const singleOutput = createBenchmarkFile(datasetName, mode, [model], ['standard'], questions.length);
  const runner = new BenchmarkRunner({
    mode, registry, models: singleModels, strategies: ['standard'],
    evaluator, summarizer: null, requestDelayMs: 0, parallelQuestions: true,
    retry: { maxRetries: 3, baseDelayMs: 2000 },
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

  const stratList = strategies.join(',');
  process.stderr.write(`  [${datasetName}] Ensemble (${ensembleSize}x ${modelName}, ${stratList})...\n`);
  const evaluator = createEvaluatorForDataset(datasetName, buildJudgeConfig(args));
  const ensembleModels = Array.from({ length: ensembleSize }, () => ({ provider, model: modelName }));
  const ensembleOutput = createBenchmarkFile(
    datasetName, mode, Array(ensembleSize).fill(model), strategies, questions.length,
  );
  const runner = new BenchmarkRunner({
    mode, registry, models: ensembleModels, strategies, evaluator,
    summarizer: { provider, model: modelName },
    requestDelayMs: 0, parallelQuestions: true,
    retry: { maxRetries: 3, baseDelayMs: 2000 },
  });
  const result = await runner.run({
    questions, outputPath: '/dev/null', output: ensembleOutput,
    onProgress: (p) => {
      process.stderr.write(`  [${datasetName}] ensemble (${stratList}) [${p.completed}/${p.total}] ${p.questionId}\n`);
    },
  });
  return result.runs;
}

export async function runDataset(args: RunDatasetArgs, parallel: boolean): Promise<DatasetResult> {
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
