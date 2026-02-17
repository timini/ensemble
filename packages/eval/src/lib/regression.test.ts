import { describe, expect, it, vi } from 'vitest';
import type {
  BenchmarkDatasetName,
  BenchmarkQuestion,
  BenchmarkResultsFile,
  EvaluationResult,
  PromptRunResult,
  StrategyName,
} from '../types.js';
import type {
  BaselineQuestionResult,
  GoldenBaselineFile,
  TierConfig,
} from './regressionTypes.js';
import { RegressionDetector } from './regression.js';
import { BenchmarkRunner } from './benchmarkRunner.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTierConfig(overrides?: Partial<TierConfig>): TierConfig {
  return {
    name: 'ci',
    datasets: [{ name: 'gsm8k', sampleSize: 4 }],
    models: [{ provider: 'openai', model: 'gpt-4o-mini' }],
    strategies: ['standard', 'majority'],
    runs: 1,
    requestDelayMs: 0,
    significanceThreshold: 0.1,
    summarizer: { provider: 'openai', model: 'gpt-4o-mini' },
    ...overrides,
  };
}

function makeEvalResult(correct: boolean, answer: string, expected: string): EvaluationResult {
  return { correct, predicted: answer, expected };
}

function makeBaselineQuestion(
  questionId: string,
  dataset: BenchmarkDatasetName,
  groundTruth: string,
  strategyResults: Partial<Record<StrategyName, EvaluationResult>>,
): BaselineQuestionResult {
  return {
    questionId,
    dataset,
    groundTruth,
    modelResults: {
      'openai:gpt-4o-mini': makeEvalResult(true, groundTruth, groundTruth),
    },
    consensusResults: strategyResults,
  };
}

function makeBaseline(
  questions: BaselineQuestionResult[],
  tier: import('./regressionTypes.js').TierName = 'ci',
): GoldenBaselineFile {
  return {
    tier,
    createdAt: '2025-01-01T00:00:00.000Z',
    commitSha: 'abc123baseline',
    config: makeTierConfig({ name: tier }),
    questionIds: questions.map((q) => q.questionId),
    results: questions,
  };
}

/** Creates a PromptRunResult from simple inputs. */
function makeRunResult(
  questionId: string,
  groundTruth: string,
  strategyCorrectness: Partial<Record<StrategyName, boolean>>,
  strategyAnswers?: Partial<Record<StrategyName, string>>,
): PromptRunResult {
  const consensusResults: Partial<Record<StrategyName, EvaluationResult>> = {};
  const consensus: Partial<Record<StrategyName, string>> = {};
  for (const [strategy, correct] of Object.entries(strategyCorrectness)) {
    const answer = strategyAnswers?.[strategy as StrategyName] ?? (correct ? groundTruth : 'wrong');
    consensusResults[strategy as StrategyName] = makeEvalResult(correct, answer, groundTruth);
    consensus[strategy as StrategyName] = answer;
  }

  return {
    questionId,
    prompt: `Question ${questionId}`,
    groundTruth,
    responses: [
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        content: groundTruth,
        responseTimeMs: 100,
        tokenCount: 50,
        estimatedCostUsd: 0.001,
      },
    ],
    consensus,
    evaluation: {
      evaluator: 'numeric' as const,
      groundTruth,
      accuracy: 1,
      results: {
        'openai:gpt-4o-mini': makeEvalResult(true, groundTruth, groundTruth),
      },
    },
    consensusEvaluation: {
      evaluator: 'numeric',
      groundTruth,
      results: consensusResults,
    },
  };
}

/**
 * Creates a mock BenchmarkRunner that returns predetermined results.
 * `runsProvider` is called each time `run()` is invoked to allow
 * different results per run (for multi-run CI tests).
 */
function mockRunner(
  runsProvider: () => PromptRunResult[],
): BenchmarkRunner {
  const runner = {
    run: vi.fn(async (options: {
      questions: BenchmarkQuestion[];
      output: BenchmarkResultsFile;
      outputPath: string;
      onProgress?: (progress: { completed: number; total: number; questionId: string; skipped: boolean }) => void;
    }): Promise<BenchmarkResultsFile> => {
      const runs = runsProvider();
      options.output.runs = runs;
      for (const [index, run] of runs.entries()) {
        options.onProgress?.({
          completed: index + 1,
          total: runs.length,
          questionId: run.questionId ?? '',
          skipped: false,
        });
      }
      return options.output;
    }),
  } as unknown as BenchmarkRunner;
  return runner;
}

// Mock loadPinnedQuestions to return questions derived from baseline
vi.mock('./questionPinning.js', () => ({
  loadPinnedQuestions: vi.fn(
    async (baseline: GoldenBaselineFile): Promise<Map<BenchmarkDatasetName, BenchmarkQuestion[]>> => {
      const result = new Map<BenchmarkDatasetName, BenchmarkQuestion[]>();
      for (const r of baseline.results) {
        const questions = result.get(r.dataset) ?? [];
        questions.push({
          id: r.questionId,
          prompt: `Question ${r.questionId}`,
          groundTruth: r.groundTruth,
        });
        result.set(r.dataset, questions);
      }
      return result;
    },
  ),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RegressionDetector', () => {
  describe('passing scenario (no regressions)', () => {
    it('returns passed=true when current accuracy matches or exceeds baseline', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
          majority: makeEvalResult(true, '42', '42'),
        }),
        makeBaselineQuestion('q2', 'gsm8k', '7', {
          standard: makeEvalResult(true, '7', '7'),
          majority: makeEvalResult(true, '7', '7'),
        }),
        makeBaselineQuestion('q3', 'gsm8k', '100', {
          standard: makeEvalResult(true, '100', '100'),
          majority: makeEvalResult(false, '99', '100'),
        }),
        makeBaselineQuestion('q4', 'gsm8k', '5', {
          standard: makeEvalResult(false, '6', '5'),
          majority: makeEvalResult(true, '5', '5'),
        }),
      ];

      const tier = makeTierConfig();
      const baseline = makeBaseline(baselineQuestions);

      // Current results: same or better accuracy
      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: true, majority: true }),
        makeRunResult('q2', '7', { standard: true, majority: true }),
        makeRunResult('q3', '100', { standard: true, majority: true }),
        makeRunResult('q4', '5', { standard: true, majority: true }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.passed).toBe(true);
      expect(result.tier).toBe('ci');
      expect(result.baselineCommitSha).toBe('abc123baseline');
      expect(result.perStrategy).toHaveLength(2); // 2 strategies x 1 dataset
      for (const sr of result.perStrategy) {
        expect(sr.significant).toBe(false);
      }
      expect(result.brokenQuestions).toHaveLength(0);
    });
  });

  describe('failing scenario (significant regression)', () => {
    it('returns passed=false when current accuracy is significantly worse', async () => {
      // Baseline: 10 questions, all correct for both strategies
      const baselineQuestions: BaselineQuestionResult[] = [];
      for (let i = 0; i < 10; i++) {
        baselineQuestions.push(
          makeBaselineQuestion(`q${i}`, 'gsm8k', `${i}`, {
            standard: makeEvalResult(true, `${i}`, `${i}`),
            majority: makeEvalResult(true, `${i}`, `${i}`),
          }),
        );
      }

      const tier = makeTierConfig({
        datasets: [{ name: 'gsm8k', sampleSize: 10 }],
        significanceThreshold: 0.1,
      });
      const baseline = makeBaseline(baselineQuestions);

      // Current: only 3 out of 10 correct for standard (big regression)
      const runner = mockRunner(() =>
        baselineQuestions.map((bq, i) =>
          makeRunResult(bq.questionId, bq.groundTruth, {
            standard: i < 3,
            majority: i < 3,
          }),
        ),
      );

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.passed).toBe(false);
      const standardResult = result.perStrategy.find(
        (s) => s.strategy === 'standard' && s.dataset === 'gsm8k',
      )!;
      expect(standardResult.baselineAccuracy).toBe(1.0);
      expect(standardResult.currentAccuracy).toBe(0.3);
      expect(standardResult.delta).toBeCloseTo(-0.7);
      expect(standardResult.significant).toBe(true);
      expect(standardResult.pValue).toBeLessThan(0.1);
    });
  });

  describe('significant improvement passes', () => {
    it('returns passed=true when improvement is significant (positive delta)', async () => {
      // With a one-sided Fisher test (lower tail), improvements yield high
      // p-values and significant=false.  But if the test were ever switched
      // to two-sided, we still need passed=true for positive deltas.
      // This test verifies the "!significant || delta >= 0" guard.

      // Baseline: 10 questions, only 3 correct
      const baselineQuestions: BaselineQuestionResult[] = [];
      for (let i = 0; i < 10; i++) {
        baselineQuestions.push(
          makeBaselineQuestion(`q${i}`, 'gsm8k', `${i}`, {
            standard: makeEvalResult(i < 3, i < 3 ? `${i}` : 'wrong', `${i}`),
          }),
        );
      }

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [{ name: 'gsm8k', sampleSize: 10 }],
        significanceThreshold: 0.1,
      });
      const baseline = makeBaseline(baselineQuestions);

      // Current: all 10 correct (big improvement)
      const runner = mockRunner(() =>
        baselineQuestions.map((bq) =>
          makeRunResult(bq.questionId, bq.groundTruth, { standard: true }),
        ),
      );

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      // Must pass even with a big accuracy swing
      expect(result.passed).toBe(true);
      const standardResult = result.perStrategy.find(
        (s) => s.strategy === 'standard' && s.dataset === 'gsm8k',
      )!;
      expect(standardResult.delta).toBeGreaterThan(0);
    });
  });

  describe('broken question identification', () => {
    it('identifies questions that were correct in baseline but wrong now', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
          majority: makeEvalResult(true, '42', '42'),
        }),
        makeBaselineQuestion('q2', 'gsm8k', '7', {
          standard: makeEvalResult(true, '7', '7'),
          majority: makeEvalResult(false, '8', '7'),
        }),
        makeBaselineQuestion('q3', 'gsm8k', '100', {
          standard: makeEvalResult(true, '100', '100'),
          majority: makeEvalResult(true, '100', '100'),
        }),
      ];

      const tier = makeTierConfig({
        datasets: [{ name: 'gsm8k', sampleSize: 3 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      // q1: standard now wrong; q3: majority now wrong
      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: false, majority: true }, { standard: '99' }),
        makeRunResult('q2', '7', { standard: true, majority: true }),
        makeRunResult('q3', '100', { standard: true, majority: false }, { majority: '50' }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.brokenQuestions).toHaveLength(2);

      const brokenQ1 = result.brokenQuestions.find(
        (bq) => bq.questionId === 'q1' && bq.strategy === 'standard',
      );
      expect(brokenQ1).toBeDefined();
      expect(brokenQ1!.dataset).toBe('gsm8k');
      expect(brokenQ1!.groundTruth).toBe('42');
      expect(brokenQ1!.baselineAnswer).toBe('42');
      expect(brokenQ1!.currentAnswer).toBe('99');

      const brokenQ3 = result.brokenQuestions.find(
        (bq) => bq.questionId === 'q3' && bq.strategy === 'majority',
      );
      expect(brokenQ3).toBeDefined();
      expect(brokenQ3!.groundTruth).toBe('100');
      expect(brokenQ3!.currentAnswer).toBe('50');
    });

    it('does not flag questions that were already wrong in baseline', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(false, '99', '42'), // already wrong in baseline
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [{ name: 'gsm8k', sampleSize: 1 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      // Still wrong - not a broken question (it was never correct)
      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: false }, { standard: '88' }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.brokenQuestions).toHaveLength(0);
    });
  });

  describe('CI tier multiple runs with median', () => {
    it('computes median accuracy across multiple runs', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
        makeBaselineQuestion('q2', 'gsm8k', '7', {
          standard: makeEvalResult(true, '7', '7'),
        }),
        makeBaselineQuestion('q3', 'gsm8k', '100', {
          standard: makeEvalResult(true, '100', '100'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        runs: 3,
        datasets: [{ name: 'gsm8k', sampleSize: 3 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      // Three runs with varying accuracy:
      // Run 1: 3/3 correct (1.0)
      // Run 2: 2/3 correct (0.667)
      // Run 3: 3/3 correct (1.0)
      // Median: 1.0
      let callCount = 0;
      const runner = mockRunner(() => {
        callCount++;
        if (callCount === 2) {
          // Second run: q3 is wrong
          return [
            makeRunResult('q1', '42', { standard: true }),
            makeRunResult('q2', '7', { standard: true }),
            makeRunResult('q3', '100', { standard: false }),
          ];
        }
        // First and third runs: all correct
        return [
          makeRunResult('q1', '42', { standard: true }),
          makeRunResult('q2', '7', { standard: true }),
          makeRunResult('q3', '100', { standard: true }),
        ];
      });

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.passed).toBe(true);
      expect(result.stability).toBeDefined();
      expect(result.stability!.runsCompleted).toBe(3);

      // The median run (1.0) matches baseline (1.0), so no regression
      const standardResult = result.perStrategy.find(
        (s) => s.strategy === 'standard',
      )!;
      expect(standardResult.currentAccuracy).toBe(1.0);
      expect(standardResult.significant).toBe(false);
    });

    it('detects regression even with median across multiple runs', async () => {
      // Baseline: 6 questions, all correct
      const baselineQuestions: BaselineQuestionResult[] = [];
      for (let i = 0; i < 6; i++) {
        baselineQuestions.push(
          makeBaselineQuestion(`q${i}`, 'gsm8k', `${i}`, {
            standard: makeEvalResult(true, `${i}`, `${i}`),
          }),
        );
      }

      const tier = makeTierConfig({
        strategies: ['standard'],
        runs: 3,
        datasets: [{ name: 'gsm8k', sampleSize: 6 }],
        significanceThreshold: 0.1,
      });
      const baseline = makeBaseline(baselineQuestions);

      // All 3 runs: only 1/6 correct (0.167 accuracy)
      const runner = mockRunner(() =>
        baselineQuestions.map((bq, i) =>
          makeRunResult(bq.questionId, bq.groundTruth, {
            standard: i === 0,
          }),
        ),
      );

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.passed).toBe(false);
      const standardResult = result.perStrategy.find(
        (s) => s.strategy === 'standard',
      )!;
      expect(standardResult.baselineAccuracy).toBe(1.0);
      expect(standardResult.currentAccuracy).toBeCloseTo(1 / 6);
      expect(standardResult.significant).toBe(true);
    });
  });

  describe('cost metrics', () => {
    it('populates cost metrics from response data', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
        makeBaselineQuestion('q2', 'gsm8k', '7', {
          standard: makeEvalResult(true, '7', '7'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [{ name: 'gsm8k', sampleSize: 2 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: true }),
        makeRunResult('q2', '7', { standard: true }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      // Each run result has tokenCount: 50, estimatedCostUsd: 0.001
      expect(result.cost.totalTokens).toBe(100); // 2 questions x 50 tokens
      expect(result.cost.totalCostUsd).toBeCloseTo(0.002); // 2 x 0.001
      expect(result.cost.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stability metrics', () => {
    it('returns undefined stability for single-run tiers', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        runs: 1,
        datasets: [{ name: 'gsm8k', sampleSize: 1 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: true }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.stability).toBeUndefined();
    });

    it('computes accuracy variance for CI tier with multiple runs', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
        makeBaselineQuestion('q2', 'gsm8k', '7', {
          standard: makeEvalResult(true, '7', '7'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        runs: 3,
        datasets: [{ name: 'gsm8k', sampleSize: 2 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      // Run 1: 2/2 correct (1.0)
      // Run 2: 1/2 correct (0.5)
      // Run 3: 2/2 correct (1.0)
      let callCount = 0;
      const runner = mockRunner(() => {
        callCount++;
        if (callCount === 2) {
          return [
            makeRunResult('q1', '42', { standard: true }),
            makeRunResult('q2', '7', { standard: false }),
          ];
        }
        return [
          makeRunResult('q1', '42', { standard: true }),
          makeRunResult('q2', '7', { standard: true }),
        ];
      });

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.stability).toBeDefined();
      expect(result.stability!.runsCompleted).toBe(3);
      // Variance of [1.0, 0.5, 1.0] = mean=0.833, var = ((1-0.833)^2 + (0.5-0.833)^2 + (1-0.833)^2) / 3
      const expectedVar = ((1 - 5 / 6) ** 2 * 2 + (0.5 - 5 / 6) ** 2) / 3;
      expect(result.stability!.accuracyVariance.standard).toBeCloseTo(expectedVar, 4);
    });
  });

  describe('ensemble delta', () => {
    it('computes ensemble delta comparing best strategy vs best model', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
        makeBaselineQuestion('q2', 'gsm8k', '7', {
          standard: makeEvalResult(true, '7', '7'),
        }),
        makeBaselineQuestion('q3', 'gsm8k', '100', {
          standard: makeEvalResult(false, '99', '100'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [{ name: 'gsm8k', sampleSize: 3 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      // Individual model: 2/3 correct. Consensus (standard): 3/3 correct.
      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: true }),
        makeRunResult('q2', '7', { standard: true }),
        makeRunResult('q3', '100', { standard: true }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.ensembleDelta).toBeDefined();
      expect(result.ensembleDelta!.bestModelName).toBe('openai:gpt-4o-mini');
      expect(result.ensembleDelta!.bestStrategyName).toBe('standard');
      // Model gets 3/3 correct (mock responses contain groundTruth),
      // strategy also 3/3 => delta = 0
      expect(result.ensembleDelta!.delta).toBeCloseTo(0);
    });
  });

  describe('progress callback', () => {
    it('invokes onProgress during evaluation', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [{ name: 'gsm8k', sampleSize: 1 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: true }),
      ]);

      const progressEvents: Array<{ questionId: string; completed: number }> = [];
      const detector = new RegressionDetector(tier, baseline, runner);
      await detector.evaluate({
        onProgress: (progress) => {
          progressEvents.push({
            questionId: progress.questionId,
            completed: progress.completed,
          });
        },
      });

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0].questionId).toBe('q1');
    });
  });

  describe('multi-dataset support', () => {
    it('evaluates across multiple datasets', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
        makeBaselineQuestion('q2', 'truthfulqa', 'yes', {
          standard: makeEvalResult(true, 'yes', 'yes'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [
          { name: 'gsm8k', sampleSize: 1 },
          { name: 'truthfulqa', sampleSize: 1 },
        ],
      });
      const baseline = makeBaseline(baselineQuestions);

      const runner = mockRunner(() => [
        // The mock runner doesn't differentiate per-dataset; we rely on the
        // pinned questions returning the correct dataset split.
        // For each dataset call, it returns all questions.
        // This tests that the runner is called once per dataset.
        makeRunResult('q1', '42', { standard: true }),
      ]);

      // We need a runner that returns different results per dataset call
      let datasetCall = 0;
      const multiDatasetRunner = {
        run: vi.fn(async (options: {
          questions: BenchmarkQuestion[];
          output: BenchmarkResultsFile;
          outputPath: string;
          onProgress?: (progress: { completed: number; total: number; questionId: string; skipped: boolean }) => void;
        }): Promise<BenchmarkResultsFile> => {
          datasetCall++;
          if (datasetCall === 1) {
            // gsm8k
            options.output.runs = [makeRunResult('q1', '42', { standard: true })];
          } else {
            // truthfulqa
            options.output.runs = [makeRunResult('q2', 'yes', { standard: true })];
          }
          return options.output;
        }),
      } as unknown as BenchmarkRunner;

      const detector = new RegressionDetector(tier, baseline, multiDatasetRunner);
      const result = await detector.evaluate();

      expect(result.passed).toBe(true);
      // 1 strategy x 2 datasets = 2 perStrategy entries
      expect(result.perStrategy).toHaveLength(2);
      const gsm8k = result.perStrategy.find((s) => s.dataset === 'gsm8k')!;
      const tqa = result.perStrategy.find((s) => s.dataset === 'truthfulqa')!;
      expect(gsm8k.strategy).toBe('standard');
      expect(tqa.strategy).toBe('standard');
    });
  });

  describe('result shape', () => {
    it('includes all required fields in RegressionResult', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [{ name: 'gsm8k', sampleSize: 1 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: true }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      // Verify all required fields exist
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('commitSha');
      expect(result).toHaveProperty('baselineCommitSha');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('perStrategy');
      expect(result).toHaveProperty('brokenQuestions');
      expect(result).toHaveProperty('stability');
      expect(result).toHaveProperty('cost');
      expect(result).toHaveProperty('ensembleDelta');

      // Verify types
      expect(typeof result.tier).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.passed).toBe('boolean');
      expect(Array.isArray(result.perStrategy)).toBe(true);
      expect(Array.isArray(result.brokenQuestions)).toBe(true);
      expect(typeof result.cost.totalTokens).toBe('number');
      expect(typeof result.cost.totalCostUsd).toBe('number');
      expect(typeof result.cost.durationMs).toBe('number');

      // Verify StrategyRegressionResult shape
      const sr = result.perStrategy[0];
      expect(sr).toHaveProperty('strategy');
      expect(sr).toHaveProperty('dataset');
      expect(sr).toHaveProperty('baselineAccuracy');
      expect(sr).toHaveProperty('currentAccuracy');
      expect(sr).toHaveProperty('delta');
      expect(sr).toHaveProperty('pValue');
      expect(sr).toHaveProperty('significant');
    });

    it('uses commitSha from options when provided', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [{ name: 'gsm8k', sampleSize: 1 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: true }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate({ commitSha: 'abc123current' });

      expect(result.commitSha).toBe('abc123current');
    });

    it('defaults commitSha to empty string when not provided', async () => {
      const baselineQuestions = [
        makeBaselineQuestion('q1', 'gsm8k', '42', {
          standard: makeEvalResult(true, '42', '42'),
        }),
      ];

      const tier = makeTierConfig({
        strategies: ['standard'],
        datasets: [{ name: 'gsm8k', sampleSize: 1 }],
      });
      const baseline = makeBaseline(baselineQuestions);

      const runner = mockRunner(() => [
        makeRunResult('q1', '42', { standard: true }),
      ]);

      const detector = new RegressionDetector(tier, baseline, runner);
      const result = await detector.evaluate();

      expect(result.commitSha).toBe('');
    });
  });
});
