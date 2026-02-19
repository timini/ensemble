import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { ConcurrencyLimiter, SystemMonitor } from '../lib/concurrencyPool.js';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { resolveBenchmarkDatasetName } from '../lib/benchmarkDatasetShared.js';
import { loadEnsembleCache } from '../lib/ensembleCache.js';
import { parseStrategies } from '../lib/consensus.js';
import { parseModelSpec } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { printResults, type DatasetResult } from './quickEvalOutput.js';
import { runDataset, type RunDatasetArgs } from './quickEvalRunner.js';
import {
  buildBaselineFromResults, loadBaseline, saveBaseline,
  checkRegression, printRegressionReport,
} from './quickEvalBaseline.js';
import type { BenchmarkDatasetName, BenchmarkQuestion, EvalMode, StrategyName } from '../types.js';

const DEFAULT_MODEL = 'google:gemini-2.5-flash-lite';
const DEFAULT_CONSENSUS_MODEL = 'google:gemini-2.5-flash-lite';
const DEFAULT_JUDGE_MODEL = 'google:gemini-2.5-flash';
const DEFAULT_ENSEMBLE_SIZE = 5;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_SAMPLE = 30;
const DEFAULT_DATASETS: BenchmarkDatasetName[] = [
  'gsm8k', 'truthfulqa', 'gpqa', 'hle', 'math500',
  'mmlu_pro', 'simpleqa', 'arc', 'hellaswag', 'hallumix',
];
const VALID_MODES: EvalMode[] = ['mock', 'free'];

interface QuickEvalOptions {
  model: string;
  consensusModel: string;
  judgeModel: string;
  ensemble: string;
  temperature: string;
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
    .option('--model <provider:model>', 'Model to evaluate (used for cache lookup).', DEFAULT_MODEL)
    .option('--consensus-model <provider:model>', 'Model for consensus strategy execution (summarizer, elo, council).', DEFAULT_CONSENSUS_MODEL)
    .option('--judge-model <provider:model>', 'Model for LLM judge evaluation.', DEFAULT_JUDGE_MODEL)
    .option('--ensemble <count>', 'Number of ensemble instances.', String(DEFAULT_ENSEMBLE_SIZE))
    .option('--temperature <value>', 'Sampling temperature for ensemble diversity (0 = deterministic).', String(DEFAULT_TEMPERATURE))
    .option('--strategies <strategies...>', 'Consensus strategies (standard,elo,majority,council). Comma-separated.')
    .option('--datasets <datasets...>', 'Datasets to evaluate. Comma-separated. Defaults to all.')
    .option('--sample <count>', 'Questions per dataset.', String(DEFAULT_SAMPLE))
    .option('--mode <mode>', 'Provider mode (mock or free).', 'free')
    .option('--no-cache', 'Disable single-model baseline caching.')
    .option('--no-parallel', 'Run datasets sequentially instead of in parallel.')
    .option('--baseline <path>', 'Path to baseline JSON. Saves results and fails on regression.')
    .option('--significance <alpha>', 'Significance level for regression detection (0 < alpha < 1).', '0.10')
    .option('--concurrency <count>', 'Initial max concurrent questions (auto-adapts via AIMD).', '40')
    .action(async (options: QuickEvalOptions) => {
      const { provider, model: modelName } = parseModelSpec(options.model);
      const model = options.model;
      const { provider: consensusProvider, model: consensusModelName } = parseModelSpec(options.consensusModel);
      const { provider: judgeProvider, model: judgeModelName } = parseModelSpec(options.judgeModel);

      const ensembleSize = Number.parseInt(options.ensemble, 10);
      if (!Number.isInteger(ensembleSize) || ensembleSize < 2) {
        throw new Error(`Ensemble size must be >= 2, got "${options.ensemble}".`);
      }

      const temperature = Number.parseFloat(options.temperature);
      if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
        throw new Error(`Temperature must be between 0 and 2, got "${options.temperature}".`);
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
      const providers = new Set([provider, consensusProvider, judgeProvider]);
      registerProviders(registry, [...providers], mode);

      const monitor = new SystemMonitor();
      const limiter = new ConcurrencyLimiter({ initial: initialConcurrency, min: 1, max: 60, monitor });

      const startTime = Date.now();
      const log = (s: string) => process.stderr.write(s);
      log(`\n  Model: ${model}  Consensus: ${options.consensusModel}  Judge: ${options.judgeModel}\n`);
      log(`  Ensemble: ${ensembleSize}x  Temp: ${temperature}  Mode: ${mode}\n`);
      log(`  Strategies: ${strategies.join(', ')}  Concurrency: ${initialConcurrency} (AIMD)\n`);
      log(`  Datasets: ${datasetNames.join(', ')}  Sample: ${sampleCount}  Parallel: ${parallel ? 'yes' : 'no'}\n\n`);

      // Load questions, filtering to cached IDs when ensemble cache exists.
      // This ensures 100% cache hit rate when using pre-generated responses.
      const datasetQuestions: Array<{ name: BenchmarkDatasetName; questions: BenchmarkQuestion[] }> = [];
      const loadResults = await Promise.allSettled(
        datasetNames.map(async (name) => {
          // Check for ensemble cache first
          const ensembleCache = useCache
            ? await loadEnsembleCache(model, name, ensembleSize, temperature)
            : null;

          if (ensembleCache && ensembleCache.size > 0) {
            // Cache exists: load ALL questions (unsampled) then filter to cached IDs.
            // Use seed=42 for deterministic sampling — same questions every run.
            const all = (await loadBenchmarkQuestions(name, { shuffle: true, seed: 42 })).questions;
            const cachedIds = new Set(ensembleCache.keys());
            const cachedQuestions = all.filter((q) => cachedIds.has(q.id));
            const sampled = cachedQuestions.slice(0, Math.min(sampleCount, cachedQuestions.length));
            log(`  [${name}] ${cachedIds.size} cached questions, using ${sampled.length}\n`);
            return { name, questions: sampled };
          }

          // No cache: load with standard sampling
          return {
            name,
            questions: (await loadBenchmarkQuestions(name, { sample: sampleCount })).questions,
          };
        }),
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
        limiter, temperature,
        consensusProvider, consensusModelName,
        judgeProvider, judgeModelName,
      }));

      limiter.startStatsReporter(1_000);

      const allDatasetResults = parallel
        ? await Promise.all(runArgs.map((a) => runDataset(a, true)))
        : await runArgs.reduce<Promise<DatasetResult[]>>(
            async (acc, a) => [...(await acc), await runDataset(a, false)], Promise.resolve([]),
          );

      limiter.stop();
      const finalStats = limiter.getStats();
      const wallSec = Math.round((Date.now() - startTime) / 1000);
      log(`\n  [limiter final] ${finalStats.completed} tasks in ${wallSec}s (${(finalStats.completed / Math.max(wallSec, 1)).toFixed(1)}/s avg) | 429s: ${finalStats.rateLimits}\n`);

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
            process.stdout.write('  Baseline NOT updated (regression detected).\n');
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
