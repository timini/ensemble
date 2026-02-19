import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import type { ConcurrencyLimiter } from '../lib/concurrencyPool.js';
import { loadCachedBaseline } from '../lib/baselineCache.js';
import { loadEnsembleCache } from '../lib/ensembleCache.js';
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
  /** Shared adaptive concurrency limiter. */
  limiter?: ConcurrencyLimiter;
  /** Sampling temperature for ensemble diversity. */
  temperature?: number;
  /** Judge model config (separate from evaluated model). */
  judgeProvider?: EvalProvider;
  judgeModelName?: string;
}

function buildJudgeConfig(args: RunDatasetArgs): JudgeConfig | undefined {
  const judgeProvider = args.judgeProvider ?? args.provider;
  const judgeModel = args.judgeModelName ?? args.modelName;
  try {
    return {
      provider: args.registry.getProvider(judgeProvider, args.mode),
      model: judgeModel,
    };
  } catch (error) {
    process.stderr.write(
      `Warning: judge provider unavailable (${error instanceof Error ? error.message : String(error)})\n`,
    );
    return undefined;
  }
}

/**
 * Load pre-computed single baseline results from cache, filtered to the
 * sampled question IDs. If the cache doesn't exist, falls back to running
 * the single baseline live (generates 1 response + evaluates per question).
 */
async function runSingleBaseline(args: RunDatasetArgs): Promise<PromptRunResult[]> {
  const { datasetName, questions, model, provider, modelName, mode, registry, useCache } = args;

  // Try pre-computed baseline cache first (sample-independent, keyed by model+dataset)
  if (useCache) {
    const baselineCache = await loadCachedBaseline(model, datasetName);
    if (baselineCache && baselineCache.size > 0) {
      const hits = questions.filter((q) => baselineCache.has(q.id));
      if (hits.length === questions.length) {
        process.stderr.write(`  [${datasetName}] Single (1x ${modelName}) — pre-computed (${hits.length} cached)\n`);
        return questions.map((q) => baselineCache.get(q.id)!);
      }
      // Partial cache hit — log and fall through to live run
      process.stderr.write(`  [${datasetName}] Single — partial cache (${hits.length}/${questions.length}), running live\n`);
    }
  }

  // Fallback: run live (no pre-computed cache available)
  process.stderr.write(`  [${datasetName}] Single (1x ${modelName})...\n`);
  const evaluator = createEvaluatorForDataset(datasetName, buildJudgeConfig(args));
  const singleModels = [{ provider, model: modelName }];
  const singleOutput = createBenchmarkFile(datasetName, mode, [model], ['standard'], questions.length);
  const runner = new BenchmarkRunner({
    mode, registry, models: singleModels, strategies: ['standard'],
    evaluator, summarizer: null, requestDelayMs: 0, parallelQuestions: true,
    retry: { maxRetries: 3, baseDelayMs: 2000 },
    limiter: args.limiter,
  });
  const result = await runner.run({
    questions, outputPath: '/dev/null', output: singleOutput,
    onProgress: (p) => {
      const q = p.queuedMs !== undefined ? `${(p.queuedMs / 1000).toFixed(1)}s` : '?';
      const r = p.runMs !== undefined ? `${(p.runMs / 1000).toFixed(1)}s` : '?';
      process.stderr.write(`  [${datasetName}] single [${p.completed}/${p.total}] queued=${q} run=${r} ${p.questionId}\n`);
    },
  });

  return result.runs;
}

async function runEnsemble(args: RunDatasetArgs): Promise<PromptRunResult[]> {
  const { datasetName, questions, model, provider, modelName, ensembleSize, strategies, mode, registry, useCache } = args;
  const temperature = args.temperature ?? 0.7;

  // Load ensemble response cache (raw API responses, independent of consensus strategy).
  const ensembleCache = useCache
    ? await loadEnsembleCache(model, datasetName, ensembleSize, temperature)
    : null;
  const cacheHits = ensembleCache ? questions.filter((q) => ensembleCache.has(q.id)).length : 0;

  const stratList = strategies.join(',');
  const cacheInfo = cacheHits > 0 ? ` (${cacheHits}/${questions.length} cached)` : '';
  process.stderr.write(`  [${datasetName}] Ensemble (${ensembleSize}x ${modelName}, ${stratList})${cacheInfo}...\n`);
  const evaluator = createEvaluatorForDataset(datasetName, buildJudgeConfig(args));
  const ensembleModels = Array.from({ length: ensembleSize }, () => ({ provider, model: modelName }));
  const ensembleOutput = createBenchmarkFile(
    datasetName, mode, Array(ensembleSize).fill(model), strategies, questions.length,
  );
  const runner = new BenchmarkRunner({
    mode, registry, models: ensembleModels, strategies, evaluator,
    summarizer: { provider, model: modelName },
    temperature: args.temperature,
    requestDelayMs: 0, parallelQuestions: true,
    retry: { maxRetries: 3, baseDelayMs: 2000 },
    limiter: args.limiter,
    ensembleResponseCache: ensembleCache ?? undefined,
  });
  const result = await runner.run({
    questions, outputPath: '/dev/null', output: ensembleOutput,
    onProgress: (p) => {
      const q = p.queuedMs !== undefined ? `${(p.queuedMs / 1000).toFixed(1)}s` : '?';
      const r = p.runMs !== undefined ? `${(p.runMs / 1000).toFixed(1)}s` : '?';
      process.stderr.write(`  [${datasetName}] ensemble (${stratList}) [${p.completed}/${p.total}] queued=${q} run=${r} ${p.questionId}\n`);
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
