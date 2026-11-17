import type { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import type { EndpointLocation } from '@ensemble-ai/shared-utils/pricing';
import type { ConcurrencyLimiter } from './concurrencyPool.js';
import { generateConsensus, type ConsensusGenerationResult } from './consensus.js';
import {
  evaluateConsensusStrategies,
  evaluateResponses,
  failureOf,
  type EvaluatorLike,
} from './evaluation.js';
import { writeJsonFile } from './io.js';
import { EnsembleRunner } from './ensembleRunner.js';
import { mechanicalMajority } from './mechanicalMajority.js';
import type { AnswerProtocol } from './methodology.js';
import type { RetryOptions } from './retryable.js';
import type {
  AnswerFailure,
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
  /** Max time (ms) for a single question. A question that runs out of time counts as wrong. Default: no timeout. */
  questionTimeoutMs?: number;
  /**
   * `structured` asks every model for a structured final answer and runs
   * majority as a mechanical vote where answers allow it. Defaults to
   * `legacy` (free-text replies), the protocol of the committed caches.
   */
  protocol?: AnswerProtocol;
  /** OpenAI-compatible endpoints, for pricing their models. */
  endpoints?: EndpointLocation[];
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
  private readonly protocol: AnswerProtocol;
  private readonly endpoints: EndpointLocation[];

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
    this.protocol = config.protocol ?? 'legacy';
    this.endpoints = config.endpoints ?? [];
    this.ensembleRunner = new EnsembleRunner(config.registry, config.mode, {
      requestDelayMs: config.requestDelayMs,
      temperature: config.temperature,
      retry: config.retry,
      onRateLimit: config.limiter ? () => config.limiter!.notifyRateLimit() : undefined,
      endpoints: this.endpoints,
    });
  }

  private questionFields(question: BenchmarkQuestion): Partial<PromptRunResult> {
    return {
      questionId: question.id,
      prompt: question.prompt,
      groundTruth: question.groundTruth,
      category: question.category,
      difficulty: question.difficulty,
      ...(this.protocol === 'structured' ? { answerProtocol: 'structured' as const } : {}),
      ...(question.optionPermutation
        ? { optionPermutation: question.optionPermutation, optionSeed: question.optionSeed }
        : {}),
    };
  }

  /**
   * A question that failed or ran out of time as a whole. Every model and
   * every strategy is scored wrong, so failures lower accuracy instead of
   * shrinking the sample.
   */
  private async failedRun(
    question: BenchmarkQuestion,
    failure: AnswerFailure,
    message: string,
  ): Promise<PromptRunResult> {
    const responses: ProviderResponse[] = this.models.map(({ provider, model }) => ({
      provider,
      model,
      content: '',
      responseTimeMs: 0,
      error: message,
    }));
    const evaluation = await evaluateResponses(this.evaluator, responses, question.groundTruth, question.prompt);
    const consensusEvaluation = await evaluateConsensusStrategies(
      this.evaluator, {}, question.groundTruth, question.prompt, this.strategies,
    );
    if (consensusEvaluation) {
      for (const result of Object.values(consensusEvaluation.results)) {
        if (result) result.failure = failure;
      }
    }
    if (evaluation) {
      for (const result of Object.values(evaluation.results)) result.failure = failure;
    }
    return {
      ...this.questionFields(question),
      prompt: question.prompt,
      responses,
      consensus: {},
      evaluation,
      consensusEvaluation,
      failure,
    };
  }

  /** Consensus for one question: a mechanical majority vote where possible, LLM strategies for the rest. */
  private async consensusFor(
    question: BenchmarkQuestion,
    responses: ProviderResponse[],
  ): Promise<ConsensusGenerationResult> {
    const spec = this.protocol === 'structured' ? question.answer : undefined;
    const vote = spec && this.strategies.includes('majority') ? mechanicalMajority(responses, spec) : null;
    const mechanical = Boolean(spec && spec.kind !== 'text' && this.strategies.includes('majority'));
    const llmStrategies = mechanical ? this.strategies.filter((s) => s !== 'majority') : this.strategies;

    const firstSuccessful = responses.find((response) => !response.error);
    const summarizerTarget = this.summarizer
      ? this.summarizer
      : firstSuccessful
        ? { provider: firstSuccessful.provider, model: firstSuccessful.model }
        : null;
    const result: ConsensusGenerationResult = summarizerTarget && llmStrategies.length > 0
      ? await generateConsensus(
          llmStrategies,
          question.prompt,
          responses,
          this.registry.getProvider(summarizerTarget.provider, this.mode),
          summarizerTarget.model,
          { provider: summarizerTarget.provider, endpoints: this.endpoints },
        )
      : { outputs: {}, metrics: {} };

    if (vote) {
      result.outputs.majority = vote.text;
      result.metrics.majority = { tokenCount: 0, durationMs: 0, costUsd: 0, mechanical: true };
    }
    return result;
  }

  private async runQuestion(question: BenchmarkQuestion): Promise<PromptRunResult> {
    const questionStart = Date.now();
    const qElapsed = () => ((Date.now() - questionStart) / 1000).toFixed(1);

    const cachedResponses = this.ensembleResponseCache?.get(question.id);
    const answerSpec = this.protocol === 'structured' ? question.answer : undefined;
    const responses = cachedResponses ?? await this.ensembleRunner.runPrompt(
      question.prompt,
      this.models,
      answerSpec ? { answer: answerSpec } : {},
    );
    const responsesMs = Date.now() - questionStart;

    const consensusStart = Date.now();
    const consensusResult = await this.consensusFor(question, responses);
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
      this.strategies,
    );
    const consEvalMs = Date.now() - consEvalStart;

    const totalMs = Date.now() - questionStart;
    if (totalMs > 10_000) {
      process.stderr.write(
        `  [slow-q] ${question.id} ${qElapsed()}s total: responses=${(responsesMs / 1000).toFixed(1)}s consensus=${(consensusMs / 1000).toFixed(1)}s eval=${(evalMs / 1000).toFixed(1)}s consEval=${(consEvalMs / 1000).toFixed(1)}s\n`,
      );
    }

    return {
      ...this.questionFields(question),
      prompt: question.prompt,
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
            // Race execution against a timeout.
            // Use .unref() so the timer doesn't prevent Node from exiting,
            // and clear it on completion to avoid dangling handles.
            let timer: ReturnType<typeof setTimeout>;
            const timeoutPromise = new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error(`Question ${question.id} timed out after ${this.questionTimeoutMs}ms`)), this.questionTimeoutMs);
              timer.unref();
            });
            try {
              const result = await Promise.race([executeFn(), timeoutPromise]);
              clearTimeout(timer!);
              return result;
            } catch (err) {
              clearTimeout(timer!);
              throw err;
            }
          };
          let run: PromptRunResult;
          try {
            run = await executeWithOptionalTimeout();
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const failure = failureOf(message);
            if (failure === 'timeout') timedOut += 1;
            process.stderr.write(`  [${failure}] ${question.id}: ${message}\n`);
            run = await this.failedRun(question, failure, message);
          }
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
        } else {
          process.stderr.write(`  [error] ${String(result.reason)}\n`);
        }
      }
      if (timedOut > 0) {
        process.stderr.write(`  [timeout] ${timedOut} question(s) timed out and count as wrong (note: zombie tasks may still hold limiter slots)\n`);
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

        let run: PromptRunResult;
        try {
          run = await this.runQuestion(question);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          process.stderr.write(`  [error] ${question.id}: ${message}\n`);
          run = await this.failedRun(question, failureOf(message), message);
        }
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
