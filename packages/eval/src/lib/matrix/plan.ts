/**
 * Jobs of a matrix run and where their results go.
 *
 * Layout under the results directory (see docs/BENCHMARKS.md):
 *   <run-id>/manifest.json               config, mode, estimate, status
 *   <run-id>/<dataset>/ensemble.json     the open models together (each alone is read from the same calls)
 *   <run-id>/<dataset>/reference.json    the premium reference
 *   <run-id>/summary.json                accuracy, intervals, p-values and cost per configuration
 *   cache/<mode>/reference/<model>/<dataset>-<key>.json   reference answers, reused across runs
 */
import { join } from 'node:path';
import type { EvalMode, StrategyName, BenchmarkDatasetName } from '../../types.js';
import type { MatrixConfig, MatrixModel } from './config.js';

export type MatrixJobKind = 'ensemble' | 'reference';

export interface MatrixJob {
  dataset: BenchmarkDatasetName;
  kind: MatrixJobKind;
  models: MatrixModel[];
  strategies: StrategyName[];
  /** Results file inside the run directory. */
  outputPath: string;
  /** Shared cache the job resumes from and writes back to (reference only). */
  cachePath?: string;
}

/** Default run id: date and matrix name (`2026-11-17-m3-matrix`). */
export function defaultRunId(config: Pick<MatrixConfig, 'name'>, date: Date): string {
  return `${date.toISOString().slice(0, 10)}-${config.name}`;
}

/** A run id or model id made safe for a path segment. */
export function slug(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
}

export function runDirOf(resultsDir: string, runId: string): string {
  return join(resultsDir, slug(runId));
}

export function referenceCachePath(
  resultsDir: string,
  mode: EvalMode,
  config: MatrixConfig,
  dataset: BenchmarkDatasetName,
): string {
  const key = `n${config.sample}-q${config.questionSeed}-o${config.optionSeed}-${config.protocol}-t${config.temperature}`;
  return join(resultsDir, 'cache', mode, 'reference', slug(config.reference.spec), `${dataset}-${key}.json`);
}

/** Two jobs per dataset: the ensemble of open models and the reference. */
export function planJobs(
  config: MatrixConfig,
  options: { resultsDir: string; runId: string; mode: EvalMode },
): MatrixJob[] {
  const dir = runDirOf(options.resultsDir, options.runId);
  return config.datasets.flatMap((dataset): MatrixJob[] => [
    {
      dataset,
      kind: 'ensemble',
      models: config.models,
      strategies: config.ensembleStrategies,
      outputPath: join(dir, dataset, 'ensemble.json'),
    },
    {
      dataset,
      kind: 'reference',
      models: [config.reference],
      strategies: [],
      outputPath: join(dir, dataset, 'reference.json'),
      cachePath: referenceCachePath(options.resultsDir, options.mode, config, dataset),
    },
  ]);
}
