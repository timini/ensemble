/**
 * `generate-cache` command — pre-generates ensemble responses for a fixed
 * subset of questions per dataset and saves them to the ensemble cache.
 *
 * This is a separate workflow from `quick-eval`. It does NOT run
 * consensus strategies or evaluation — it ONLY generates the raw
 * model responses (5 per question at temperature=0.7) so that
 * subsequent `quick-eval` runs can load them from cache.
 *
 * Key design: generates responses for a FIXED set of N questions per
 * dataset (default 100). These questions are chosen by shuffling the
 * full dataset with a deterministic seed, then taking the first N.
 * Future `quick-eval` runs automatically filter to only these cached
 * question IDs, ensuring 100% cache hit rate.
 *
 * Why separate:
 * - Generating responses is expensive (5 API calls per question).
 *   Consensus + evaluation is cheap. They have different lifecycles.
 * - You might want to use a pro model for generation (one-time cost)
 *   but a cheaper model for consensus/judging.
 * - 100 questions per dataset provides good statistical significance
 *   while keeping generation costs manageable.
 *
 * Usage:
 *   ensemble-eval generate-cache --model google:gemini-2.5-pro
 *   ensemble-eval generate-cache --datasets gsm8k,truthfulqa
 *   ensemble-eval generate-cache --sample 200  # more questions
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
const DEFAULT_SAMPLE = 100;
const DEFAULT_SEED = 42; // Deterministic shuffle for reproducibility
const DEFAULT_DATASETS: BenchmarkDatasetName[] = [
  'gsm8k', 'truthfulqa', 'gpqa', 'hle', 'math500',
  'mmlu_pro', 'simpleqa', 'arc', 'hellaswag', 'hallumix',
];

interface GenerateCacheOptions {
  model: string;
  ensemble: string;
  temperature: string;
  sample: string;
  seed: string;
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
    .option('--sample <count>', 'Questions per dataset to generate responses for.', String(DEFAULT_SAMPLE))
    .option('--seed <value>', 'Seed for deterministic shuffle (same seed = same questions).', String(DEFAULT_SEED))
    .option('--datasets <datasets...>', 'Datasets to generate for. Comma-separated. Defaults to all.')
    .option('--mode <mode>', 'Provider mode (mock or free).', 'free')
    .option('--concurrency <count>', 'Initial max concurrent questions (auto-adapts via AIMD).', '40')
    .action(async (options: GenerateCacheOptions) => {
      const { provider, model: modelName } = parseModelSpec(options.model);
      const model = options.model;
      const ensembleSize = Number.parseInt(options.ensemble, 10);
      const temperature = Number.parseFloat(options.temperature);
      const sampleCount = Number.parseInt(options.sample, 10);
      const seed = Number.parseInt(options.seed, 10);
      const mode = options.mode as EvalMode;
      const initialConcurrency = Number.parseInt(options.concurrency, 10);
      const datasetNames = parseDatasets(options.datasets);

      const registry = new ProviderRegistry();
      registerProviders(registry, [provider], mode);

      const monitor = new SystemMonitor();
      const limiter = new ConcurrencyLimiter({ initial: initialConcurrency, min: 1, max: 60, monitor });

      const log = (s: string) => process.stderr.write(s);
      log(`\n  generate-cache: ${model} ${ensembleSize}x t=${temperature}\n`);
      log(`  Datasets: ${datasetNames.join(', ')}  Sample: ${sampleCount}  Seed: ${seed}\n\n`);

      const ensembleRunner = new EnsembleRunner(registry, mode, {
        temperature,
        retry: { maxRetries: 3, baseDelayMs: 2000 },
        onRateLimit: () => limiter.notifyRateLimit(),
      });
      const ensembleModels = Array.from({ length: ensembleSize }, () => ({ provider, model: modelName }));

      const startTime = Date.now();
      limiter.startStatsReporter(2_000);

      for (const datasetName of datasetNames) {
        // Load a fixed subset of questions using deterministic shuffle.
        // The seed ensures the same questions are selected every time,
        // so re-running generate-cache picks up where it left off.
        let selectedQuestions: BenchmarkQuestion[];
        try {
          const result = await loadBenchmarkQuestions(datasetName, {
            sample: sampleCount,
            shuffle: true,
            seed,
          });
          selectedQuestions = result.questions;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          log(`  [${datasetName}] SKIP — ${msg}\n`);
          continue;
        }

        // Load existing cache to skip already-generated questions
        const existingCache = await loadEnsembleCache(model, datasetName, ensembleSize, temperature);
        const cachedIds = existingCache ? new Set(existingCache.keys()) : new Set<string>();
        const uncached = selectedQuestions.filter((q) => !cachedIds.has(q.id));

        log(`  [${datasetName}] ${selectedQuestions.length} selected, ${cachedIds.size} cached, ${uncached.length} to generate\n`);

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
