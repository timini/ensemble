/**
 * Run the benchmark matrix: load and prepare each dataset, estimate the cost
 * of what is left, stop unless spending was confirmed, run every job with
 * checkpoints after each batch of questions, then write the summary.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ProviderRegistry, type ProviderRouting } from '@ensemble-ai/shared-utils/providers';
import { assertValidResumedOutput, createBenchmarkFile } from '../../commands/benchmarkOutput.js';
import { loadBenchmarkQuestions } from '../benchmarkDatasets.js';
import { BenchmarkRunner, isUsableResponse } from '../benchmarkRunner.js';
import { createEvaluatorForDataset, datasetNeedsJudge } from '../evaluators.js';
import { isMechanical } from '../finalAnswer.js';
import { fileExists, readJsonFile, writeJsonFile } from '../io.js';
import { prepareQuestions } from '../methodology.js';
import { endpointsOf } from '../modelSpecs.js';
import { registerProviders } from '../providers.js';
import type {
  BenchmarkQuestion,
  BenchmarkResultsFile,
  EvalMode,
  ModelSpec,
  PromptRunResult,
  ProviderResponse,
  StrategyName,
} from '../../types.js';
import type { MatrixConfig } from './config.js';
import { describeDifferences, experimentDifferences, experimentOf, recordedExperiment } from './experiment.js';
import { estimateJob, formatEstimate, totalEstimate, type MatrixEstimate } from './estimate.js';
import { planJobs, runDirOf, type MatrixJob } from './plan.js';
import { forPublication, notRunSummary, summarizeMatrix, type DatasetResults, type MatrixSummary } from './summary.js';

export interface MatrixRunOptions {
  config: MatrixConfig;
  /** The config as read from disk, kept in the manifest. */
  rawConfig: unknown;
  mode: EvalMode;
  resultsDir: string;
  runId: string;
  /** Confirms spending in free mode. */
  yes: boolean;
  /** Print the estimate (and publish a not-run summary) without running. */
  planOnly?: boolean;
  /** Also write the summary here (the app's committed copy). */
  publishPath?: string;
  /** With planOnly, replace a published summary that holds results. */
  force?: boolean;
  skipDownload?: boolean;
  /** Questions run at once per job. Results are written after each batch. */
  concurrency?: number;
  /**
   * Run again the entries of an existing run that failed (an error, a
   * timeout, an empty answer or a failed consensus), keeping every answer
   * that succeeded. Entries that still fail after their retries count as
   * wrong, as before.
   */
  retryFailed?: boolean;
  /**
   * Resume a run id even though result-affecting settings (seeds, protocol,
   * temperature, models, summarizer, strategies, reference) differ from the
   * ones it started with. Without it such a resume is refused.
   */
  allowConfigChange?: boolean;
  log?: (line: string) => void;
  now?: () => Date;
}

/**
 * True when a stored run needs another attempt: the question failed or timed
 * out, a model call failed or came back empty, or a consensus strategy failed.
 */
export function isFailedRun(run: PromptRunResult): boolean {
  if (run.failure) return true;
  if (run.responses.some((response) => !isUsableResponse(response))) return true;
  const failedResult = (results: Record<string, { failure?: unknown } | undefined> | undefined) =>
    Object.values(results ?? {}).some((result) => Boolean(result?.failure));
  return failedResult(run.evaluation?.results) || failedResult(run.consensusEvaluation?.results);
}

/**
 * The failed runs of a results file, by question id, with their answers so
 * models whose answer succeeded are not called again. The runs stay in the
 * file until their replacements are written, so an interrupted repair
 * loses nothing.
 */
export function failedRunsOf(output: BenchmarkResultsFile): Map<string, ProviderResponse[]> {
  const prior = new Map<string, ProviderResponse[]>();
  for (const run of output.runs) {
    if (run.questionId && isFailedRun(run)) prior.set(run.questionId, run.responses);
  }
  return prior;
}

/** How a run routes OpenRouter calls, as recorded in the manifest. */
export function routingOf(config: MatrixConfig) {
  const models = Object.fromEntries(
    [...config.models, config.reference].filter((m) => m.routing).map((m) => [m.id, m.routing]),
  );
  return { requireParameters: config.requireParameters, ...(Object.keys(models).length > 0 ? { models } : {}) };
}

/** Routing for each model spec of the config (OpenRouter host preferences and require_parameters). */
function routingLookup(config: MatrixConfig): (spec: ModelSpec) => ProviderRouting | undefined {
  const all = [...config.models, config.reference];
  return (spec) => {
    const entry = all.find((m) => m.parsed.provider === spec.provider && m.parsed.model === spec.model);
    return {
      requireParameters: config.requireParameters,
      ...(entry?.routing ? { provider: entry.routing } : {}),
    };
  };
}

interface PreviousManifest {
  createdAt?: string;
  config?: unknown;
  experiment?: unknown;
  routing?: unknown;
  repairs?: unknown[];
  configChanges?: unknown[];
}

export interface MatrixRunResult {
  estimate: MatrixEstimate;
  ran: boolean;
  summary: MatrixSummary | null;
}

async function existingResults(
  job: MatrixJob,
  mode: EvalMode,
  sampleSize: number,
): Promise<BenchmarkResultsFile | null> {
  const models = job.models.map((m) => m.spec);
  // The reference resumes from the shared cache, which may hold more than this run's copy.
  for (const path of [job.cachePath, job.outputPath]) {
    if (!path || !(await fileExists(path))) continue;
    const parsed = await readJsonFile<unknown>(path);
    assertValidResumedOutput(path, parsed, { dataset: job.dataset, mode, models, strategies: job.strategies, sampleSize });
    return parsed;
  }
  return null;
}

function mechanicalStrategies(questions: BenchmarkQuestion[], strategies: StrategyName[]): StrategyName[] {
  const allMechanical = questions.every((q) => q.answer && isMechanical(q.answer));
  return allMechanical && strategies.includes('majority') ? ['majority'] : [];
}

/** True when the file is a summary with results (status partial or complete). */
async function holdsResults(path: string): Promise<boolean> {
  if (!(await fileExists(path))) return false;
  try {
    const status = (await readJsonFile<{ status?: unknown }>(path)).status;
    return status === 'partial' || status === 'complete';
  } catch {
    return false;
  }
}

/** Run (or plan) the matrix. */
export async function runMatrix(options: MatrixRunOptions): Promise<MatrixRunResult> {
  const { config, mode } = options;
  const log = options.log ?? ((line: string) => process.stdout.write(`${line}\n`));
  const now = options.now ?? (() => new Date());
  const jobs = planJobs(config, options);
  const runDir = runDirOf(options.resultsDir, options.runId);
  const endpoints = endpointsOf([...config.models.map((m) => m.parsed), config.reference.parsed]);

  const manifestPath = join(runDir, 'manifest.json');
  const previous = (await fileExists(manifestPath))
    ? await readJsonFile<PreviousManifest>(manifestPath)
    : null;
  const experiment = experimentOf(config);
  const started = previous ? recordedExperiment(previous, config) : null;
  const changed = started ? experimentDifferences(started, experiment) : [];
  if (started && changed.length > 0) {
    const detail = describeDifferences(started, experiment, changed);
    if (!options.allowConfigChange) {
      throw new Error(
        `Run ${options.runId} was started with different settings: ${detail}. `
        + 'Its results would be relabelled as this configuration. Use a new --run-id, '
        + 'or pass --allow-config-change to resume it anyway.',
      );
    }
    log(`Resuming ${options.runId} with changed settings (--allow-config-change): ${detail}.`);
  }

  const questionsByDataset = new Map<string, BenchmarkQuestion[]>();
  for (const dataset of config.datasets) {
    if (datasetNeedsJudge(dataset, config.protocol)) {
      throw new Error(`Dataset ${dataset} needs an LLM judge under the ${config.protocol} protocol; the matrix scores mechanically only.`);
    }
    const loaded = await loadBenchmarkQuestions(dataset, {
      sample: config.sample,
      seed: config.questionSeed,
      ...(options.skipDownload ? { skipDownload: true } : {}),
    });
    questionsByDataset.set(dataset, prepareQuestions(dataset, loaded.questions, {
      protocol: config.protocol, optionSeed: config.optionSeed,
    }));
  }

  const existing = new Map<MatrixJob, BenchmarkResultsFile | null>();
  const estimates = [];
  for (const job of jobs) {
    const questions = questionsByDataset.get(job.dataset)!;
    const file = await existingResults(job, mode, questions.length);
    existing.set(job, file);
    const kept = (file?.runs ?? []).filter((run) => !options.retryFailed || !isFailedRun(run));
    if (options.retryFailed) {
      const failedCount = (file?.runs.length ?? 0) - kept.length;
      log(`${job.dataset} ${job.kind}: ${failedCount} failed entr${failedCount === 1 ? 'y' : 'ies'} to run again.`);
    }
    const done = new Set(kept.map((run) => run.questionId));
    const promptTokens = Math.ceil(questions.reduce((s, q) => s + q.prompt.length, 0) / Math.max(1, questions.length) / 4);
    estimates.push(estimateJob({
      job,
      pending: questions.filter((q) => !done.has(q.id)).length,
      promptTokens,
      summarizer: config.summarizer,
      mechanicalStrategies: mechanicalStrategies(questions, job.strategies),
      endpoints,
    }));
  }
  const estimate = totalEstimate(estimates);
  log(formatEstimate(estimate, config.budgetUsd));

  if (options.planOnly) {
    if (options.publishPath) {
      if (!options.force && (await holdsResults(options.publishPath))) {
        log(`${options.publishPath} holds results; left as it is. Pass --force to replace it with a not-run summary.`);
      } else {
        await writeJsonFile(options.publishPath, notRunSummary(config, estimate, now()));
        log(`Wrote a not-run summary to ${options.publishPath}`);
      }
    }
    return { estimate, ran: false, summary: null };
  }
  if (mode === 'free' && !options.yes && estimate.calls > 0) {
    log('Nothing was run. Re-run with --yes to make these calls and spend up to the high estimate.');
    return { estimate, ran: false, summary: null };
  }

  const registry = new ProviderRegistry();
  registerProviders(registry, [...config.models, config.reference].map((m) => m.parsed.provider), mode, endpoints);
  const createdAt = previous?.createdAt ?? now().toISOString();
  // A repair keeps the routing and config the run started with, and records its own.
  const routing = previous ? previous.routing ?? 'not recorded (run started before routing was recorded; require_parameters was not sent)' : routingOf(config);
  const repairs = [
    ...(previous?.repairs ?? []),
    ...(options.retryFailed ? [{ at: now().toISOString(), routing: routingOf(config), config: options.rawConfig }] : []),
  ];
  const configChanges = [
    ...(previous?.configChanges ?? []),
    ...(changed.length > 0 ? [{ at: now().toISOString(), fields: changed, experiment, config: options.rawConfig }] : []),
  ];
  const writeManifest = (status: string) => writeJsonFile(manifestPath, {
    schemaVersion: 1, runId: options.runId, mode, status, createdAt, updatedAt: now().toISOString(),
    config: previous?.config ?? options.rawConfig, experiment: started ?? experiment, routing,
    ...(repairs.length > 0 ? { repairs } : {}),
    ...(configChanges.length > 0 ? { configChanges } : {}),
    estimate: { calls: estimate.calls, lowUsd: estimate.lowUsd, highUsd: estimate.highUsd },
    files: jobs.map((job) => ({ dataset: job.dataset, kind: job.kind, file: job.outputPath.slice(runDir.length + 1) })),
  });
  await writeManifest('running');

  for (const job of jobs) {
    const questions = questionsByDataset.get(job.dataset)!;
    await runJob(job, questions, existing.get(job) ?? null, { ...options, registry, endpoints, log });
  }

  const results: DatasetResults[] = [];
  for (const dataset of config.datasets) {
    const read = async (kind: MatrixJob['kind']) => {
      const job = jobs.find((j) => j.dataset === dataset && j.kind === kind)!;
      return (await fileExists(job.outputPath)) ? readJsonFile<BenchmarkResultsFile>(job.outputPath) : null;
    };
    results.push({ dataset, ensemble: await read('ensemble'), reference: await read('reference') });
  }
  const summary = summarizeMatrix(config, results, { runId: options.runId, mode, estimate, now: now() });
  await writeJsonFile(join(runDir, 'summary.json'), summary);
  await writeManifest(summary.status);
  if (options.publishPath) await writeJsonFile(options.publishPath, forPublication(summary));
  log(`Summary written to ${join(runDir, 'summary.json')}${options.publishPath ? ` and ${options.publishPath}` : ''}.`);
  return { estimate, ran: true, summary };
}

async function runJob(
  job: MatrixJob,
  questions: BenchmarkQuestion[],
  resumed: BenchmarkResultsFile | null,
  ctx: MatrixRunOptions & { registry: ProviderRegistry; endpoints: ReturnType<typeof endpointsOf>; log: (l: string) => void },
): Promise<void> {
  const { config, mode } = ctx;
  const output = resumed ?? createBenchmarkFile(
    job.dataset, mode, job.models.map((m) => m.spec), job.strategies, questions.length,
  );
  const priorResponses = ctx.retryFailed ? failedRunsOf(output) : new Map<string, ProviderResponse[]>();
  const rerunIds = new Set(priorResponses.keys());
  output.answerProtocol = config.protocol;
  if (config.protocol === 'structured') output.optionSeed = config.optionSeed;
  const working = job.cachePath ?? job.outputPath;
  const runner = new BenchmarkRunner({
    mode,
    registry: ctx.registry,
    models: job.models.map((m) => m.parsed),
    strategies: job.strategies,
    evaluator: createEvaluatorForDataset(job.dataset, undefined, { protocol: config.protocol }),
    summarizer: job.kind === 'ensemble' ? config.summarizer.parsed : null,
    temperature: config.temperature,
    protocol: config.protocol,
    endpoints: ctx.endpoints,
    parallelQuestions: true,
    questionTimeoutMs: config.questionTimeoutMs,
    callTimeoutMs: config.callTimeoutMs,
    consensusTimeoutMs: config.consensusTimeoutMs,
    retry: {
      maxRetries: config.maxRetries,
      onRetry: (error, attempt) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`  [retry ${attempt}/${config.maxRetries}] ${message}\n`);
      },
    },
    priorResponses,
    routingFor: routingLookup(config),
    maxOutputTokens: config.maxOutputTokens,
  });
  const done = new Set(output.runs.map((run) => run.questionId).filter((id) => !id || !rerunIds.has(id)));
  const pending = questions.filter((q) => !done.has(q.id));
  ctx.log(`${job.dataset} ${job.kind}: ${pending.length} of ${questions.length} question(s) to run.`);
  const size = Math.max(1, ctx.concurrency ?? 8);
  for (let i = 0; i < pending.length; i += size) {
    await runner.run({ questions: pending.slice(i, i + size), outputPath: working, output, rerunIds });
    ctx.log(`  ${job.dataset} ${job.kind}: ${Math.min(i + size, pending.length)}/${pending.length}`);
  }
  if (pending.length === 0) await writeJsonFile(working, output);
  if (job.cachePath) {
    await mkdir(dirname(job.outputPath), { recursive: true });
    await copyFile(job.cachePath, job.outputPath);
  }
}
