import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMatrixConfig } from '../lib/matrix/config.js';
import { defaultRunId } from '../lib/matrix/plan.js';
import { runMatrix } from '../lib/matrix/runner.js';
import { summarizeRun } from '../lib/matrix/summarizeRun.js';
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
  force?: boolean;
  sample?: string;
  datasets?: string[];
  concurrency: string;
  skipDownload?: boolean;
  retryFailed?: boolean;
  allowConfigChange?: boolean;
  /** False with --no-require-parameters (commander sets true otherwise). */
  requireParameters?: boolean;
  summarizeOnly?: boolean;
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
    .option('--publish [file]', 'Also write the summary for the app (free mode only for the app copy)', false)
    .option('--force', 'With --plan-only --publish, replace a summary that holds results')
    .option('--sample <n>', 'Override the questions per dataset (for dry runs)')
    .option('--datasets <names...>', 'Override the datasets (comma-separated allowed)')
    .option('--concurrency <n>', 'Questions run at once per job; results are saved after each batch', '8')
    .option('--skip-download', 'Fail instead of downloading a dataset that is not cached')
    .option('--retry-failed', 'Run again the failed, timed-out or empty entries of an existing run id; successful answers are kept')
    .option('--allow-config-change', 'Resume an existing run id even though seeds, protocol, temperature, models, summarizer, strategies or reference changed')
    .option('--no-require-parameters', 'Do not ask OpenRouter for hosts that honour response_format (the routing of runs made before it was sent)')
    .option('--summarize-only', 'With an existing --run-id, rebuild its summary from the results files; makes no calls and downloads nothing')
    .action(async (options: MatrixCommandOptions) => {
      if (options.summarizeOnly) {
        if (!options.runId) throw new Error('--summarize-only needs the --run-id of an existing run.');
        const publishPath = options.publish === true
          ? DEFAULT_PUBLISH_PATH
          : typeof options.publish === 'string' ? resolve(options.publish) : undefined;
        await summarizeRun({
          resultsDir: resolve(options.resultsDir),
          runId: options.runId,
          ...(publishPath ? { publishPath } : {}),
          appSummaryPath: DEFAULT_PUBLISH_PATH,
        });
        return;
      }
      if (options.mode !== 'free' && options.mode !== 'mock') {
        throw new Error(`Invalid mode "${options.mode}". Expected free or mock.`);
      }
      const rawConfig = JSON.parse(await readFile(resolve(options.config), 'utf8')) as unknown;
      const config = parseMatrixConfig(rawConfig, {
        ...(options.sample ? { sample: positiveInt(options.sample, 'sample') } : {}),
        ...(options.datasets ? { datasets: explodeList(options.datasets) } : {}),
        ...(options.requireParameters === false ? { requireParameters: false } : {}),
      });
      const publishPath = options.publish === true
        ? DEFAULT_PUBLISH_PATH
        : typeof options.publish === 'string' ? resolve(options.publish) : undefined;
      if (options.mode === 'mock' && publishPath === DEFAULT_PUBLISH_PATH) {
        throw new Error('A mock run is never published to the app. Pass --publish <scratch file> to write its summary elsewhere.');
      }
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
        ...(options.force ? { force: true } : {}),
        ...(options.retryFailed ? { retryFailed: true } : {}),
        ...(options.allowConfigChange ? { allowConfigChange: true } : {}),
        concurrency: positiveInt(options.concurrency, 'concurrency'),
      });
    });
}
