import type { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { generateConsensus } from './consensus.js';
import { evaluateResponses, type EvaluatorLike } from './evaluation.js';
import { writeJsonFile } from './io.js';
import { EnsembleRunner } from './ensembleRunner.js';
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

  constructor(config: BenchmarkRunnerConfig) {
    this.mode = config.mode;
    this.registry = config.registry;
    this.models = config.models;
    this.strategies = config.strategies;
    this.evaluator = config.evaluator;
    this.summarizer = config.summarizer;
    this.ensembleRunner = new EnsembleRunner(config.registry, config.mode, {
      requestDelayMs: config.requestDelayMs,
    });
  }

  async run(options: RunBenchmarkOptions): Promise<BenchmarkResultsFile> {
    const { questions, outputPath, output, onProgress } = options;
    const completedQuestionIds = new Set(
      output.runs
        .map((run) => run.questionId)
        .filter((questionId): questionId is string => Boolean(questionId)),
    );
    const completedPrompts = new Set(output.runs.map((run) => run.prompt));

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
      const consensus = summarizerTarget
        ? await generateConsensus(
            this.strategies,
            question.prompt,
            responses,
            this.registry.getProvider(summarizerTarget.provider, this.mode),
            summarizerTarget.model,
          )
        : {};

      const evaluation = await evaluateResponses(
        this.evaluator,
        responses,
        question.groundTruth,
        question.prompt,
      );

      const run: PromptRunResult = {
        questionId: question.id,
        prompt: question.prompt,
        groundTruth: question.groundTruth,
        category: question.category,
        difficulty: question.difficulty,
        responses,
        consensus,
        evaluation,
      };
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

    return output;
  }
}
