/**
 * Rebuild the summary of an existing run from its results files alone: no
 * dataset download, no provider, no model call. Used by
 * `ensemble-eval matrix --summarize-only`, for example to publish a run
 * whose account ran out of credit before a repair could finish.
 */
import { join } from 'node:path';
import { fileExists, readJsonFile, writeJsonFile } from '../io.js';
import type { BenchmarkResultsFile, EvalMode } from '../../types.js';
import { parseMatrixConfig } from './config.js';
import { runDirOf } from './plan.js';
import { forPublication, summarizeMatrix, type DatasetResults, type MatrixSummary } from './summary.js';

interface RunManifest {
  runId?: string;
  mode?: EvalMode;
  config?: unknown;
  repairs?: Array<{ config?: unknown }>;
}

export interface SummarizeRunOptions {
  resultsDir: string;
  runId: string;
  /** Also write the summary here (the app's committed copy). */
  publishPath?: string;
  /** The app's summary: a mock run is never published there. */
  appSummaryPath?: string;
  log?: (line: string) => void;
  now?: () => Date;
}

/**
 * Summary of a run from `<run-id>/manifest.json` and the results files. The
 * config is the one the last repair ran with, or the one the run started
 * with when there was no repair: a resume refuses changes to the settings
 * that affect results, so both label the same results. The summary has no
 * estimate, because nothing is run.
 */
export async function summarizeRun(options: SummarizeRunOptions): Promise<MatrixSummary> {
  const log = options.log ?? ((line: string) => process.stdout.write(`${line}\n`));
  const runDir = runDirOf(options.resultsDir, options.runId);
  const manifestPath = join(runDir, 'manifest.json');
  if (!(await fileExists(manifestPath))) {
    throw new Error(`No manifest at ${manifestPath}; --summarize-only needs an existing --run-id.`);
  }
  const manifest = await readJsonFile<RunManifest>(manifestPath);
  if (manifest.mode !== 'free' && manifest.mode !== 'mock') {
    throw new Error(`${manifestPath} has no valid mode.`);
  }
  if (manifest.mode === 'mock' && options.publishPath && options.publishPath === options.appSummaryPath) {
    throw new Error('A mock run is never published to the app. Pass --publish <scratch file> to write its summary elsewhere.');
  }
  const config = parseMatrixConfig(manifest.repairs?.at(-1)?.config ?? manifest.config);
  const read = async (dataset: string, kind: 'ensemble' | 'reference') => {
    const path = join(runDir, dataset, `${kind}.json`);
    return (await fileExists(path)) ? readJsonFile<BenchmarkResultsFile>(path) : null;
  };
  const results: DatasetResults[] = [];
  for (const dataset of config.datasets) {
    results.push({ dataset, ensemble: await read(dataset, 'ensemble'), reference: await read(dataset, 'reference') });
  }
  const summary = summarizeMatrix(config, results, {
    runId: manifest.runId ?? options.runId,
    mode: manifest.mode,
    estimate: null,
    now: (options.now ?? (() => new Date()))(),
  });
  await writeJsonFile(join(runDir, 'summary.json'), summary);
  if (options.publishPath) await writeJsonFile(options.publishPath, forPublication(summary));
  log(`Summary written to ${join(runDir, 'summary.json')}${options.publishPath ? ` and ${options.publishPath}` : ''}. No calls were made.`);
  return summary;
}
