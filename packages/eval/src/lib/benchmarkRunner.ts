import type { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import type { ConcurrencyLimiter } from './concurrencyPool.js';
import { generateConsensus } from './consensus.js';
import { evaluateConsensusStrategies, evaluateResponses, type EvaluatorLike } from './evaluation.js';
import { writeJsonFile } from './io.js';
import { EnsembleRunner } from './ensembleRunner.js';
import type { RetryOptions } from './retryable.js';
import type {
  BenchmarkQuestion,
  BenchmarkResultsFile,
  EvalMode,
  ModelSpec,
  PromptRunResult,
  ProviderResponse,
  StrategyName,
} from '../types.js';

export interface BenchmarkRunnerProgress {
  completed: number;
  total: number;
  questionId: string;
  skipped: boolean;
  /** Time spent waiting in the concurrency queue (ms). */
  queuedMs?: number;
  /** Time spent actually executing the question (ms). */
  runMs?: number;
}

interface BenchmarkRunnerConfig {
  mode: EvalMode;
  registry: ProviderRegistry;
  models: ModelSpec[];
  strategies: StrategyName[];
  evaluator: EvaluatorLike | null;
  summarizer: ModelSpec | null;
  requestDelayMs?: number;
  temperature?: number;
  retry?: RetryOptions;
  /** Run all questions concurrently instead of sequentially. */
  parallelQuestions?: boolean;
  /** Shared adaptive concurrency limiter (AIMD). Gates how many questions run at once. */
  limiter?: ConcurrencyLimiter;
  /** Pre-loaded ensemble response cache (questionId → responses). Skips API calls for cached questions. */
  ensembleResponseCache?: Map<string, ProviderResponse[]>;
  /** Max time (ms) for a single question before it's skipped. Default: no timeout. */
  questionTimeoutMs?: number;
}

interface RunBenchmarkOptions {
  questions: BenchmarkQuestion[];
  outputPath: string;
  output: BenchmarkResultsFile;
  onProgress?: (progress: BenchmarkRunnerProgress) => void;
}

export class BenchmarkRunner {
  private readonly mode: EvalMode;
  private readonly registry: ProviderRegistry;
  private readonly models: ModelSpec[];
  private readonly strategies: StrategyName[];
  private readonly evaluator: EvaluatorLike | null;
  private readonly summarizer: ModelSpec | null;
  private readonly ensembleRunner: EnsembleRunner;
  private readonly parallelQuestions: boolean;
  private readonly limiter: ConcurrencyLimiter | undefined;
  private readonly ensembleResponseCache: Map<string, ProviderResponse[]> | undefined;
  private readonly questionTimeoutMs: number | undefined;

  constructor(config: BenchmarkRunnerConfig) {
    this.mode = config.mode;
    this.registry = config.registry;
    this.models = config.models;
    this.strategies = config.strategies;
    this.evaluator = config.evaluator;
    this.summarizer = config.summarizer;
    this.parallelQuestions = config.parallelQuestions ?? false;
    this.limiter = config.limiter;
    this.ensembleResponseCache = config.ensembleResponseCache;
    this.questionTimeoutMs = config.questionTimeoutMs;
    this.ensembleRunner = new EnsembleRunner(config.registry, config.mode, {
      requestDelayMs: config.requestDelayMs,
      temperature: config.temperature,
      retry: config.retry,
      onRateLimit: config.limiter ? () => config.limiter!.notifyRateLimit() : undefined,
    });
  }

  private async runQuestion(question: BenchmarkQuestion): Promise<PromptRunResult> {
    const questionStart = Date.now();
    const qElapsed = () => ((Date.now() - questionStart) / 1000).toFixed(1);

    const cachedResponses = this.ensembleResponseCache?.get(question.id);
    const responses = cachedResponses ?? await this.ensembleRunner.runPrompt(
      question.prompt,
      this.models,
    );
    const responsesMs = Date.now() - questionStart;

    const firstSuccessful = responses.find((response) => !response.error);
    const summarizerTarget = this.summarizer
      ? this.summarizer
      : firstSuccessful
        ? { provider: firstSuccessful.provider, model: firstSuccessful.model }
        : null;
    const consensusStart = Date.now();
    const consensusResult = summarizerTarget
      ? await generateConsensus(
          this.strategies,
          question.prompt,
          responses,
          this.registry.getProvider(summarizerTarget.provider, this.mode),
          summarizerTarget.model,
        )
      : { outputs: {}, metrics: {} };
    const consensusMs = Date.now() - consensusStart;
    const consensus = consensusResult.outputs;
    const consensusMetrics = Object.keys(consensusResult.metrics).length > 0
      ? consensusResult.metrics
      : undefined;

    const evalStart = Date.now();
    const evaluation = await evaluateResponses(
      this.evaluator,
      responses,
      question.groundTruth,
      question.prompt,
    );
    const evalMs = Date.now() - evalStart;

    const consEvalStart = Date.now();
    const consensusEvaluation = await evaluateConsensusStrategies(
      this.evaluator,
      consensus,
      question.groundTruth,
      question.prompt,
    );
    const consEvalMs = Date.now() - consEvalStart;

    const totalMs = Date.now() - questionStart;
    if (totalMs > 10_000) {
      process.stderr.write(
        `  [slow-q] ${question.id} ${qElapsed()}s total: responses=${(responsesMs / 1000).toFixed(1)}s consensus=${(consensusMs / 1000).toFixed(1)}s eval=${(evalMs / 1000).toFixed(1)}s consEval=${(consEvalMs / 1000).toFixed(1)}s\n`,
      );
    }

    return {
      questionId: question.id,
      prompt: question.prompt,
      groundTruth: question.groundTruth,
      category: question.category,
      difficulty: question.difficulty,
      responses,
      consensus,
      consensusMetrics,
      evaluation,
      consensusEvaluation,
      durationMs: totalMs,
    };
  }

  async run(options: RunBenchmarkOptions): Promise<BenchmarkResultsFile> {
    const { questions, outputPath, output, onProgress } = options;
    const completedQuestionIds = new Set(
      output.runs
        .map((run) => run.questionId)
        .filter((questionId): questionId is string => Boolean(questionId)),
    );
    const completedPrompts = new Set(output.runs.map((run) => run.prompt));

    const pendingQuestions = questions.filter((q) => {
      return !completedQuestionIds.has(q.id) && !completedPrompts.has(q.prompt);
    });

    if (this.parallelQuestions && pendingQuestions.length > 0) {
      // Parallel mode: dispatch all questions, limiter gates actual execution
      let completed = questions.length - pendingQuestions.length;
      let timedOut = 0;
      const settled = await Promise.allSettled(
        pendingQuestions.map(async (question) => {
          const dispatchTime = Date.now();
          const runFn = async () => {
            const result = await this.runQuestion(question);
            return result;
          };
          const executeWithOptionalTimeout = async (): Promise<PromptRunResult> => {
            const executeFn = this.limiter ? () => this.limiter!.run(runFn) : runFn;
            if (!this.questionTimeoutMs) return executeFn();
            // Race execution against a timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Question ${question.id} timed out after ${this.questionTimeoutMs}ms`)), this.questionTimeoutMs);
            });
            return Promise.race([executeFn(), timeoutPromise]);
          };
          const run = await executeWithOptionalTimeout();
          const totalMs = Date.now() - dispatchTime;
          const runMs = run.durationMs ?? totalMs;
          const queuedMs = totalMs - runMs;
          completed += 1;
          onProgress?.({
            completed,
            total: questions.length,
            questionId: question.id,
            skipped: false,
            queuedMs,
            runMs,
          });
          return run;
        }),
      );
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const run = result.value;
          output.runs.push(run);
          completedQuestionIds.add(run.questionId ?? '');
          completedPrompts.add(run.prompt);
        } else if (result.reason instanceof Error && result.reason.message.includes('timed out')) {
          timedOut += 1;
          process.stderr.write(`  [timeout] ${result.reason.message}\n`);
        }
      }
      if (timedOut > 0) {
        process.stderr.write(`  [timeout] ${timedOut} question(s) skipped due to timeout (note: zombie tasks may still hold limiter slots)\n`);
      }
      output.updatedAt = new Date().toISOString();
      await writeJsonFile(outputPath, output);
    } else {
      // Sequential mode: process one at a time with checkpointing
      for (const [index, question] of questions.entries()) {
        const alreadyCompleted =
          completedQuestionIds.has(question.id) || completedPrompts.has(question.prompt);
        if (alreadyCompleted) {
          onProgress?.({
            completed: index + 1,
            total: questions.length,
            questionId: question.id,
            skipped: true,
          });
          continue;
        }

        const run = await this.runQuestion(question);
        output.runs.push(run);
        output.updatedAt = new Date().toISOString();
        completedQuestionIds.add(question.id);
        completedPrompts.add(question.prompt);
        await writeJsonFile(outputPath, output);

        onProgress?.({
          completed: index + 1,
          total: questions.length,
          questionId: question.id,
          skipped: false,
        });
      }
    }

    return output;
  }
}
