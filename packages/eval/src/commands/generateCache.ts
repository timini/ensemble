/**
 * `generate-cache` command — pre-generates ensemble responses for ALL
 * questions in specified datasets and saves them to the ensemble cache.
 *
 * This is a separate workflow from `quick-eval`. It does NOT run
 * consensus strategies or evaluation — it ONLY generates the raw
 * model responses (5 per question at temperature=0.7) so that
 * subsequent `quick-eval` runs can load them from cache.
 *
 * Why separate:
 * - Eval runs sample 30 questions randomly. Cache needs ALL questions
 *   so that any random sample gets cache hits.
 * - Generating responses is expensive (5 API calls per question).
 *   Consensus + evaluation is cheap. They have different lifecycles.
 * - You might want to use a pro model for generation (one-time cost)
 *   but a cheaper model for consensus/judging.
 *
 * Usage:
 *   ensemble-eval generate-cache --model google:gemini-2.5-pro
 *   ensemble-eval generate-cache --datasets gsm8k,truthfulqa
 *
 * After generating, commit the cache:
 *   git add packages/eval/.cache/ensemble/
 *   git commit -m "chore: generate ensemble cache"
 */
import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { ConcurrencyLimiter, SystemMonitor } from '../lib/concurrencyPool.js';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { resolveBenchmarkDatasetName } from '../lib/benchmarkDatasetShared.js';
import { loadEnsembleCache, saveEnsembleCache, type EnsembleCacheEntry } from '../lib/ensembleCache.js';
import { EnsembleRunner } from '../lib/ensembleRunner.js';
import { parseModelSpec } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import type { BenchmarkDatasetName, BenchmarkQuestion, EvalMode, ProviderResponse } from '../types.js';

const DEFAULT_MODEL = 'google:gemini-2.5-flash-lite';
const DEFAULT_ENSEMBLE_SIZE = 5;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_DATASETS: BenchmarkDatasetName[] = [
  'gsm8k', 'truthfulqa', 'gpqa', 'hle', 'math500',
  'mmlu_pro', 'simpleqa', 'arc', 'hellaswag', 'hallumix',
];

interface GenerateCacheOptions {
  model: string;
  ensemble: string;
  temperature: string;
  datasets?: string[];
  mode: string;
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

export function createGenerateCacheCommand(): Command {
  const command = new Command('generate-cache');
  command
    .description(
      'Pre-generate ensemble responses for all questions in specified datasets. ' +
      'Saves raw API responses to .cache/ensemble/ so that quick-eval runs can ' +
      'load cached responses instead of calling the API. Run once, commit the cache, ' +
      'then iterate on consensus strategies for free.',
    )
    .option('--model <provider:model>', 'Model to generate responses with.', DEFAULT_MODEL)
    .option('--ensemble <count>', 'Number of ensemble instances (responses per question).', String(DEFAULT_ENSEMBLE_SIZE))
    .option('--temperature <value>', 'Sampling temperature for diversity.', String(DEFAULT_TEMPERATURE))
    .option('--datasets <datasets...>', 'Datasets to generate for. Comma-separated. Defaults to all.')
    .option('--mode <mode>', 'Provider mode (mock or free).', 'free')
    .option('--concurrency <count>', 'Initial max concurrent questions (auto-adapts via AIMD).', '40')
    .action(async (options: GenerateCacheOptions) => {
      const { provider, model: modelName } = parseModelSpec(options.model);
      const model = options.model;
      const ensembleSize = Number.parseInt(options.ensemble, 10);
      const temperature = Number.parseFloat(options.temperature);
      const mode = options.mode as EvalMode;
      const initialConcurrency = Number.parseInt(options.concurrency, 10);
      const datasetNames = parseDatasets(options.datasets);

      const registry = new ProviderRegistry();
      registerProviders(registry, [provider], mode);

      const monitor = new SystemMonitor();
      const limiter = new ConcurrencyLimiter({ initial: initialConcurrency, min: 1, max: 60, monitor });

      const log = (s: string) => process.stderr.write(s);
      log(`\n  generate-cache: ${model} ${ensembleSize}x t=${temperature}\n`);
      log(`  Datasets: ${datasetNames.join(', ')}\n\n`);

      const ensembleRunner = new EnsembleRunner(registry, mode, {
        temperature,
        retry: { maxRetries: 3, baseDelayMs: 2000 },
        onRateLimit: () => limiter.notifyRateLimit(),
      });
      const ensembleModels = Array.from({ length: ensembleSize }, () => ({ provider, model: modelName }));

      const startTime = Date.now();
      limiter.startStatsReporter(2_000);

      for (const datasetName of datasetNames) {
        // Load ALL questions (no sampling)
        let allQuestions: BenchmarkQuestion[];
        try {
          const result = await loadBenchmarkQuestions(datasetName, { shuffle: false });
          allQuestions = result.questions;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          log(`  [${datasetName}] SKIP — ${msg}\n`);
          continue;
        }

        // Load existing cache to skip already-generated questions
        const existingCache = await loadEnsembleCache(model, datasetName, ensembleSize, temperature);
        const cachedIds = existingCache ? new Set(existingCache.keys()) : new Set<string>();
        const uncached = allQuestions.filter((q) => !cachedIds.has(q.id));

        log(`  [${datasetName}] ${allQuestions.length} total, ${cachedIds.size} cached, ${uncached.length} to generate\n`);

        if (uncached.length === 0) {
          log(`  [${datasetName}] fully cached — skipping\n\n`);
          continue;
        }

        // Generate responses for uncached questions
        let completed = 0;
        const newEntries: EnsembleCacheEntry[] = [];
        const settled = await Promise.allSettled(
          uncached.map(async (question) => {
            const generate = async (): Promise<{ questionId: string; responses: ProviderResponse[] }> => {
              const responses = await ensembleRunner.runPrompt(question.prompt, ensembleModels);
              return { questionId: question.id, responses };
            };
            const result = await limiter.run(generate);
            completed += 1;
            if (completed % 50 === 0 || completed === uncached.length) {
              log(`  [${datasetName}] generated ${completed}/${uncached.length}\n`);
            }
            return result;
          }),
        );

        for (const result of settled) {
          if (result.status === 'fulfilled') {
            newEntries.push(result.value);
          }
        }

        // Incremental save (merges with existing)
        await saveEnsembleCache(model, datasetName, ensembleSize, temperature, newEntries);
        const totalCached = cachedIds.size + newEntries.length;
        log(`  [${datasetName}] saved ${newEntries.length} new entries (${totalCached} total cached)\n\n`);
      }

      limiter.stop();
      const wallSec = Math.round((Date.now() - startTime) / 1000);
      log(`  Done in ${wallSec}s. Commit the cache:\n`);
      log(`    git add packages/eval/.cache/ensemble/\n`);
      log(`    git commit -m "chore: generate ensemble cache (${model})"\n\n`);
    });

  return command;
}
