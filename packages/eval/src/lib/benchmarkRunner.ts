import type { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
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
  StrategyName,
} from '../types.js';

export interface BenchmarkRunnerProgress {
  completed: number;
  total: number;
  questionId: string;
  skipped: boolean;
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

  constructor(config: BenchmarkRunnerConfig) {
    this.mode = config.mode;
    this.registry = config.registry;
    this.models = config.models;
    this.strategies = config.strategies;
    this.evaluator = config.evaluator;
    this.summarizer = config.summarizer;
    this.parallelQuestions = config.parallelQuestions ?? false;
    this.ensembleRunner = new EnsembleRunner(config.registry, config.mode, {
      requestDelayMs: config.requestDelayMs,
      temperature: config.temperature,
      retry: config.retry,
    });
  }

  private async runQuestion(question: BenchmarkQuestion): Promise<PromptRunResult> {
    const questionStart = Date.now();

    const responses = await this.ensembleRunner.runPrompt(
      question.prompt,
      this.models,
    );

    const firstSuccessful = responses.find((response) => !response.error);
    const summarizerTarget = this.summarizer
      ? this.summarizer
      : firstSuccessful
        ? { provider: firstSuccessful.provider, model: firstSuccessful.model }
        : null;
    const consensusResult = summarizerTarget
      ? await generateConsensus(
          this.strategies,
          question.prompt,
          responses,
          this.registry.getProvider(summarizerTarget.provider, this.mode),
          summarizerTarget.model,
        )
      : { outputs: {}, metrics: {} };
    const consensus = consensusResult.outputs;
    const consensusMetrics = Object.keys(consensusResult.metrics).length > 0
      ? consensusResult.metrics
      : undefined;

    const evaluation = await evaluateResponses(
      this.evaluator,
      responses,
      question.groundTruth,
      question.prompt,
    );

    const consensusEvaluation = await evaluateConsensusStrategies(
      this.evaluator,
      consensus,
      question.groundTruth,
      question.prompt,
    );

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
      durationMs: Date.now() - questionStart,
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
      // Parallel mode: fire all questions at once
      let completed = questions.length - pendingQuestions.length;
      const settled = await Promise.allSettled(
        pendingQuestions.map(async (question) => {
          const run = await this.runQuestion(question);
          completed += 1;
          onProgress?.({
            completed,
            total: questions.length,
            questionId: question.id,
            skipped: false,
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
        }
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
