import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMatrixConfig } from '../lib/matrix/config.js';
import { defaultRunId } from '../lib/matrix/plan.js';
import { runMatrix } from '../lib/matrix/runner.js';
import { explodeList } from '../lib/modelSpecs.js';
import type { EvalMode } from '../types.js';

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_CONFIG_PATH = resolve(PACKAGE_DIR, 'bench/matrix.json');
export const DEFAULT_RESULTS_DIR = resolve(PACKAGE_DIR, 'results');
/** The summary the app's /benchmarks page reads. */
export const DEFAULT_PUBLISH_PATH = resolve(PACKAGE_DIR, '../app/src/data/benchmark-summary.json');

interface MatrixCommandOptions {
  config: string;
  mode: string;
  runId?: string;
  resultsDir: string;
  yes?: boolean;
  planOnly?: boolean;
  publish?: string | boolean;
  sample?: string;
  datasets?: string[];
  concurrency: string;
  skipDownload?: boolean;
}

function positiveInt(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Invalid ${name} "${value}".`);
  return parsed;
}

/** `ensemble-eval matrix`: the benchmark matrix in one command (docs/BENCHMARKS.md). */
export function createMatrixCommand(): Command {
  return new Command('matrix')
    .description('Run the benchmark matrix from bench/matrix.json. Prints a cost estimate first; spends only with --yes.')
    .option('--config <file>', 'Matrix config file', DEFAULT_CONFIG_PATH)
    .option('--mode <mode>', 'free (real calls) or mock (mock provider, no cost)', 'free')
    .option('--run-id <id>', 'Run id; an existing id resumes that run (default: <date>-<matrix name>)')
    .option('--results-dir <dir>', 'Where run directories and the reference cache go', DEFAULT_RESULTS_DIR)
    .option('--yes', 'Confirm the spend shown in the estimate (free mode)')
    .option('--plan-only', 'Print the estimate and stop (with --publish, write a not-run summary)')
    .option('--publish [file]', 'Also write the summary for the app', false)
    .option('--sample <n>', 'Override the questions per dataset (for dry runs)')
    .option('--datasets <names...>', 'Override the datasets (comma-separated allowed)')
    .option('--concurrency <n>', 'Questions run at once per job; results are saved after each batch', '8')
    .option('--skip-download', 'Fail instead of downloading a dataset that is not cached')
    .action(async (options: MatrixCommandOptions) => {
      if (options.mode !== 'free' && options.mode !== 'mock') {
        throw new Error(`Invalid mode "${options.mode}". Expected free or mock.`);
      }
      const rawConfig = JSON.parse(await readFile(resolve(options.config), 'utf8')) as unknown;
      const config = parseMatrixConfig(rawConfig, {
        ...(options.sample ? { sample: positiveInt(options.sample, 'sample') } : {}),
        ...(options.datasets ? { datasets: explodeList(options.datasets) } : {}),
      });
      const publishPath = options.publish === true
        ? DEFAULT_PUBLISH_PATH
        : typeof options.publish === 'string' ? resolve(options.publish) : undefined;
      await runMatrix({
        config,
        rawConfig,
        mode: options.mode as EvalMode,
        resultsDir: resolve(options.resultsDir),
        runId: options.runId ?? defaultRunId(config, new Date()),
        yes: Boolean(options.yes),
        planOnly: Boolean(options.planOnly),
        ...(publishPath ? { publishPath } : {}),
        ...(options.skipDownload ? { skipDownload: true } : {}),
        concurrency: positiveInt(options.concurrency, 'concurrency'),
      });
    });
}
