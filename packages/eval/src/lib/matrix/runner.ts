/**
 * Run the benchmark matrix: load and prepare each dataset, estimate the cost
 * of what is left, stop unless spending was confirmed, run every job with
 * checkpoints after each batch of questions, then write the summary.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { assertValidResumedOutput, createBenchmarkFile } from '../../commands/benchmarkOutput.js';
import { loadBenchmarkQuestions } from '../benchmarkDatasets.js';
import { BenchmarkRunner } from '../benchmarkRunner.js';
import { createEvaluatorForDataset, datasetNeedsJudge } from '../evaluators.js';
import { isMechanical } from '../finalAnswer.js';
import { fileExists, readJsonFile, writeJsonFile } from '../io.js';
import { prepareQuestions } from '../methodology.js';
import { endpointsOf } from '../modelSpecs.js';
import { registerProviders } from '../providers.js';
import type { BenchmarkQuestion, BenchmarkResultsFile, EvalMode, StrategyName } from '../../types.js';
import type { MatrixConfig } from './config.js';
import { estimateJob, formatEstimate, totalEstimate, type MatrixEstimate } from './estimate.js';
import { planJobs, runDirOf, type MatrixJob } from './plan.js';
import { notRunSummary, summarizeMatrix, type DatasetResults, type MatrixSummary } from './summary.js';

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
  skipDownload?: boolean;
  /** Questions run at once per job. Results are written after each batch. */
  concurrency?: number;
  log?: (line: string) => void;
  now?: () => Date;
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

/** Run (or plan) the matrix. */
export async function runMatrix(options: MatrixRunOptions): Promise<MatrixRunResult> {
  const { config, mode } = options;
  const log = options.log ?? ((line: string) => process.stdout.write(`${line}\n`));
  const now = options.now ?? (() => new Date());
  const jobs = planJobs(config, options);
  const runDir = runDirOf(options.resultsDir, options.runId);
  const endpoints = endpointsOf([...config.models.map((m) => m.parsed), config.reference.parsed]);

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
    const done = new Set((file?.runs ?? []).map((run) => run.questionId));
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
      await writeJsonFile(options.publishPath, notRunSummary(config, estimate, now()));
      log(`Wrote a not-run summary to ${options.publishPath}`);
    }
    return { estimate, ran: false, summary: null };
  }
  if (mode === 'free' && !options.yes && estimate.calls > 0) {
    log('Nothing was run. Re-run with --yes to make these calls and spend up to the high estimate.');
    return { estimate, ran: false, summary: null };
  }

  const registry = new ProviderRegistry();
  registerProviders(registry, [...config.models, config.reference].map((m) => m.parsed.provider), mode, endpoints);
  const manifestPath = join(runDir, 'manifest.json');
  const createdAt = (await fileExists(manifestPath))
    ? (await readJsonFile<{ createdAt?: string }>(manifestPath)).createdAt ?? now().toISOString()
    : now().toISOString();
  const writeManifest = (status: string) => writeJsonFile(manifestPath, {
    schemaVersion: 1, runId: options.runId, mode, status, createdAt, updatedAt: now().toISOString(),
    config: options.rawConfig, estimate: { calls: estimate.calls, lowUsd: estimate.lowUsd, highUsd: estimate.highUsd },
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
  if (options.publishPath) await writeJsonFile(options.publishPath, summary);
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
  });
  const done = new Set(output.runs.map((run) => run.questionId));
  const pending = questions.filter((q) => !done.has(q.id));
  ctx.log(`${job.dataset} ${job.kind}: ${pending.length} of ${questions.length} question(s) to run.`);
  const size = Math.max(1, ctx.concurrency ?? 8);
  for (let i = 0; i < pending.length; i += size) {
    await runner.run({ questions: pending.slice(i, i + size), outputPath: working, output });
    ctx.log(`  ${job.dataset} ${job.kind}: ${Math.min(i + size, pending.length)}/${pending.length}`);
  }
  if (pending.length === 0) await writeJsonFile(working, output);
  if (job.cachePath) {
    await mkdir(dirname(job.outputPath), { recursive: true });
    await copyFile(job.cachePath, job.outputPath);
  }
}
