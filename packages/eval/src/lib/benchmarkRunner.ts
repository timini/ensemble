import type { ProviderRegistry, ProviderRouting } from '@ensemble-ai/shared-utils/providers';
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
import { mechanicalMajority, UNREADABLE_VOTE } from './mechanicalMajority.js';
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
  /**
   * Max time (ms) for a single question, from when it starts running (time
   * queued for a slot does not count). It is a hard cap that retries fit
   * into: model calls must be over by the limit minus consensusTimeoutMs
   * (when a summary follows), summarizer calls by the limit itself, and no
   * retry starts that could not finish in time. A call stopped that way
   * counts as wrong; answers that came back are kept. Default: no limit.
   */
  questionTimeoutMs?: number;
  /**
   * `structured` asks every model for a structured final answer and runs
   * majority as a mechanical vote where answers allow it. Defaults to
   * `legacy` (free-text replies), the protocol of the committed caches.
   */
  protocol?: AnswerProtocol;
  /** OpenAI-compatible endpoints, for pricing their models. */
  endpoints?: EndpointLocation[];
  /** Limit for one model call (ms). The request is aborted when it passes. Default: the client's. */
  callTimeoutMs?: number;
  /** Limit for one summarizer call (ms). Default: the client's (120 s for streams). */
  consensusTimeoutMs?: number;
  /**
   * Answers kept from an earlier attempt (questionId to responses, in model
   * order). A model whose kept answer succeeded is not called again; the
   * others are. Used to repair failed entries of a run.
   */
  priorResponses?: Map<string, ProviderResponse[]>;
  /** Host routing per model, summarizer included (OpenRouter). */
  routingFor?: (spec: ModelSpec) => ProviderRouting | undefined;
  /** Most output tokens per call (`max_tokens`): model answers and summarizer calls. Default: none sent. */
  maxOutputTokens?: number;
}

/** Room left at the end of a question for scoring after the last call (ms). */
const SCORING_MARGIN_MS = 5_000;

/** Answers of one question as they come back, by model index, so a question timeout keeps them. */
type ResponseHolder = (ProviderResponse | undefined)[];

/** True for an answer worth keeping: no error and some text. */
export function isUsableResponse(response: ProviderResponse | undefined): response is ProviderResponse {
  return Boolean(response && !response.error && response.content.trim());
}

interface RunBenchmarkOptions {
  questions: BenchmarkQuestion[];
  outputPath: string;
  output: BenchmarkResultsFile;
  onProgress?: (progress: BenchmarkRunnerProgress) => void;
  /**
   * Question ids whose stored run is run again and replaced in place when
   * the new run is done (--retry-failed). Until then the old run stays in
   * the output, so an interrupted pass loses nothing.
   */
  rerunIds?: Set<string>;
}

/** Sum of the priced costs in a stored run that a replacement does not carry over. */
function droppedCostOf(old: PromptRunResult, replacement: PromptRunResult): number {
  const kept = new Set(replacement.responses);
  let usd = old.priorAttemptCostUsd ?? 0;
  for (const response of old.responses) {
    if (!kept.has(response)) usd += response.estimatedCostUsd ?? 0;
  }
  for (const metrics of Object.values(old.consensusMetrics ?? {})) usd += metrics?.costUsd ?? 0;
  return usd;
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
  private readonly retry: RetryOptions | undefined;
  private readonly consensusTimeoutMs: number | undefined;
  private readonly priorResponses: Map<string, ProviderResponse[]> | undefined;
  private readonly routingFor: BenchmarkRunnerConfig['routingFor'];
  private readonly maxOutputTokens: number | undefined;

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
    this.retry = config.retry;
    this.consensusTimeoutMs = config.consensusTimeoutMs;
    this.priorResponses = config.priorResponses;
    this.routingFor = config.routingFor;
    this.maxOutputTokens = config.maxOutputTokens;
    this.ensembleRunner = new EnsembleRunner(config.registry, config.mode, {
      requestDelayMs: config.requestDelayMs,
      temperature: config.temperature,
      retry: config.retry,
      onRateLimit: config.limiter ? () => config.limiter!.notifyRateLimit() : undefined,
      endpoints: this.endpoints,
      ...(config.callTimeoutMs !== undefined ? { callTimeoutMs: config.callTimeoutMs } : {}),
      ...(config.routingFor ? { routingFor: config.routingFor } : {}),
      ...(config.maxOutputTokens !== undefined ? { maxOutputTokens: config.maxOutputTokens } : {}),
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

  /** A kept answer from an earlier attempt for model `index`, if it succeeded. */
  private priorAnswer(questionId: string, index: number): ProviderResponse | undefined {
    const response = this.priorResponses?.get(questionId)?.[index];
    const spec = this.models[index]!;
    return isUsableResponse(response) && response.provider === spec.provider && response.model === spec.model
      ? response
      : undefined;
  }

  /**
   * A question that failed or ran out of time as a whole. Answers that came
   * back before that (or were kept from an earlier attempt) are scored as
   * usual; the models without one and every strategy are scored wrong, so
   * failures lower accuracy instead of shrinking the sample.
   */
  private async failedRun(
    question: BenchmarkQuestion,
    failure: AnswerFailure,
    message: string,
    holder: ResponseHolder = [],
  ): Promise<PromptRunResult> {
    const responses: ProviderResponse[] = this.models.map(({ provider, model }, i) => {
      const settled = holder[i];
      if (isUsableResponse(settled)) return settled;
      return this.priorAnswer(question.id, i) ?? settled ?? { provider, model, content: '', responseTimeMs: 0, error: message };
    });
    const evaluation = await evaluateResponses(this.evaluator, responses, question.groundTruth, question.prompt);
    const consensusEvaluation = await evaluateConsensusStrategies(
      this.evaluator, {}, question.groundTruth, question.prompt, this.strategies,
    );
    if (consensusEvaluation) {
      for (const result of Object.values(consensusEvaluation.results)) {
        if (result) result.failure = failure;
      }
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
    signal?: AbortSignal,
    deadline?: number,
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
          {
            ...(this.consensusTimeoutMs !== undefined ? { timeoutMs: this.consensusTimeoutMs } : {}),
            ...(this.retry ? { retry: this.retry } : {}),
            ...(signal ? { signal } : {}),
            ...(deadline !== undefined ? { deadline } : {}),
            ...(this.routingFor?.(summarizerTarget) ? { routing: this.routingFor(summarizerTarget) } : {}),
            ...(this.maxOutputTokens !== undefined ? { maxTokens: this.maxOutputTokens } : {}),
          },
        )
      : { outputs: {}, metrics: {} };

    if (vote) {
      result.outputs.majority = vote.text;
      result.metrics.majority = { tokenCount: 0, durationMs: 0, costUsd: 0, mechanical: true };
    } else if (mechanical && firstSuccessful) {
      // Replies came back but none had a readable answer. The vote has no
      // answer, which is scored wrong; it is not a failed call.
      result.outputs.majority = UNREADABLE_VOTE;
      result.metrics.majority = { tokenCount: 0, durationMs: 0, costUsd: 0, mechanical: true };
    }
    return result;
  }

  /**
   * Responses for a question: cached, kept from an earlier attempt, or fresh
   * calls. Each one goes into `holder` as soon as it is final.
   */
  private async responsesFor(
    question: BenchmarkQuestion,
    holder: ResponseHolder,
    signal?: AbortSignal,
    deadline?: number,
  ): Promise<ProviderResponse[]> {
    const cachedResponses = this.ensembleResponseCache?.get(question.id);
    if (cachedResponses) {
      cachedResponses.forEach((response, i) => { holder[i] = response; });
      return cachedResponses;
    }
    const answerSpec = this.protocol === 'structured' ? question.answer : undefined;
    const kept = this.models.map((_, i) => this.priorAnswer(question.id, i));
    kept.forEach((response, i) => { if (response) holder[i] = response; });
    const toCallIndex = this.models.map((_, i) => i).filter((i) => !kept[i]);
    const options = {
      ...(answerSpec ? { answer: answerSpec } : {}),
      ...(signal ? { signal } : {}),
      ...(deadline !== undefined ? { deadline } : {}),
      onResponse: (j: number, response: ProviderResponse) => { holder[toCallIndex[j]!] = response; },
    };
    const toCall = toCallIndex.map((i) => this.models[i]!);
    const fresh = toCall.length > 0 ? await this.ensembleRunner.runPrompt(question.prompt, toCall, options) : [];
    let next = 0;
    return kept.map((response) => response ?? fresh[next++]!);
  }

  /** True when a summarizer call follows the answers of a question. */
  private needsSummary(): boolean {
    const llm = this.protocol === 'structured'
      ? this.strategies.filter((s) => s !== 'majority')
      : this.strategies;
    return llm.length > 0;
  }

  private async runQuestion(
    question: BenchmarkQuestion,
    signal?: AbortSignal,
    holder: ResponseHolder = [],
  ): Promise<PromptRunResult> {
    const questionStart = Date.now();
    const qElapsed = () => ((Date.now() - questionStart) / 1000).toFixed(1);

    // Deadlines inside the question limit: the answers leave room for one
    // summarizer call, the summary leaves room for scoring.
    const questionLimit = this.questionTimeoutMs;
    const margin = questionLimit ? Math.min(SCORING_MARGIN_MS, Math.floor(questionLimit / 20)) : 0;
    const consensusDeadline = questionLimit ? questionStart + questionLimit - margin : undefined;
    const responsesDeadline = consensusDeadline !== undefined && this.needsSummary()
      ? consensusDeadline - (this.consensusTimeoutMs ?? 0)
      : consensusDeadline;

    const responses = await this.responsesFor(question, holder, signal, responsesDeadline);
    const responsesMs = Date.now() - questionStart;
    if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason));

    const consensusStart = Date.now();
    const consensusResult = await this.consensusFor(question, responses, signal, consensusDeadline);
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
    const rerunIds = options.rerunIds ?? new Set<string>();
    const completedQuestionIds = new Set(
      output.runs
        .map((run) => run.questionId)
        .filter((questionId): questionId is string => Boolean(questionId) && !rerunIds.has(questionId!)),
    );
    const completedPrompts = new Set(
      output.runs.filter((run) => !run.questionId || !rerunIds.has(run.questionId)).map((run) => run.prompt),
    );
    const isDone = (q: BenchmarkQuestion) =>
      !rerunIds.has(q.id) && (completedQuestionIds.has(q.id) || completedPrompts.has(q.prompt));

    /** Store a finished run: replace the stored run it reruns, or append it. */
    const store = (run: PromptRunResult) => {
      const index = run.questionId && rerunIds.has(run.questionId)
        ? output.runs.findIndex((r) => r.questionId === run.questionId)
        : -1;
      if (index >= 0) {
        const dropped = droppedCostOf(output.runs[index]!, run);
        output.runs[index] = dropped > 0 ? { ...run, priorAttemptCostUsd: dropped } : run;
        rerunIds.delete(run.questionId!);
      } else {
        output.runs.push(run);
      }
      completedQuestionIds.add(run.questionId ?? '');
      completedPrompts.add(run.prompt);
    };

    const pendingQuestions = questions.filter((q) => !isDone(q));

    if (this.parallelQuestions && pendingQuestions.length > 0) {
      // Parallel mode: dispatch all questions, limiter gates actual execution
      let completed = questions.length - pendingQuestions.length;
      let timedOut = 0;
      const settled = await Promise.allSettled(
        pendingQuestions.map(async (question) => {
          const dispatchTime = Date.now();
          const holder: ResponseHolder = [];
          // The question limit starts when the question gets a slot. When it
          // passes, the controller cancels the question's requests and
          // retries, so the task ends and frees its limiter slot.
          const runFn = async (): Promise<PromptRunResult> => {
            const controller = new AbortController();
            if (!this.questionTimeoutMs) return this.runQuestion(question, controller.signal, holder);
            // Use .unref() so the timer doesn't prevent Node from exiting,
            // and clear it on completion to avoid dangling handles.
            let timer: ReturnType<typeof setTimeout> | undefined;
            const timeoutPromise = new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                const error = new Error(`Question ${question.id} timed out after ${this.questionTimeoutMs}ms`);
                controller.abort(error);
                reject(error);
              }, this.questionTimeoutMs);
              timer.unref();
            });
            try {
              return await Promise.race([this.runQuestion(question, controller.signal, holder), timeoutPromise]);
            } finally {
              clearTimeout(timer);
            }
          };
          let run: PromptRunResult;
          try {
            run = await (this.limiter ? this.limiter.run(runFn) : runFn());
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const failure = failureOf(message);
            if (failure === 'timeout') timedOut += 1;
            process.stderr.write(`  [${failure}] ${question.id}: ${message}\n`);
            run = await this.failedRun(question, failure, message, holder);
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
          store(result.value);
        } else {
          process.stderr.write(`  [error] ${String(result.reason)}\n`);
        }
      }
      if (timedOut > 0) {
        process.stderr.write(`  [timeout] ${timedOut} question(s) timed out; their requests were aborted, answers that came back are kept\n`);
      }
      output.updatedAt = new Date().toISOString();
      await writeJsonFile(outputPath, output);
    } else {
      // Sequential mode: process one at a time with checkpointing
      for (const [index, question] of questions.entries()) {
        if (isDone(question)) {
          onProgress?.({
            completed: index + 1,
            total: questions.length,
            questionId: question.id,
            skipped: true,
          });
          continue;
        }

        const holder: ResponseHolder = [];
        let run: PromptRunResult;
        try {
          run = await this.runQuestion(question, undefined, holder);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          process.stderr.write(`  [error] ${question.id}: ${message}\n`);
          run = await this.failedRun(question, failureOf(message), message, holder);
        }
        store(run);
        output.updatedAt = new Date().toISOString();
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
