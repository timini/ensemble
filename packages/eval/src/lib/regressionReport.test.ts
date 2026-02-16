import { describe, expect, it } from 'vitest';
import { createRegressionReport } from './regressionReport.js';
import type {
  BrokenQuestion,
  CostMetrics,
  RegressionResult,
  StabilityMetrics,
  StrategyRegressionResult,
} from './regressionTypes.js';

function makeStrategyResult(
  overrides?: Partial<StrategyRegressionResult>,
): StrategyRegressionResult {
  return {
    strategy: 'standard',
    dataset: 'gsm8k',
    baselineAccuracy: 0.8,
    currentAccuracy: 0.85,
    delta: 0.05,
    pValue: 0.32,
    significant: false,
    ...overrides,
  };
}

function makeBrokenQuestion(overrides?: Partial<BrokenQuestion>): BrokenQuestion {
  return {
    questionId: 'q-42',
    dataset: 'gsm8k',
    strategy: 'standard',
    groundTruth: '42',
    baselineAnswer: '42',
    currentAnswer: '99',
    ...overrides,
  };
}

function makeCost(overrides?: Partial<CostMetrics>): CostMetrics {
  return {
    totalTokens: 12500,
    totalCostUsd: 0.23,
    durationMs: 125000,
    ...overrides,
  };
}

function makePassingResult(overrides?: Partial<RegressionResult>): RegressionResult {
  return {
    tier: 'ci',
    timestamp: '2026-02-15T10:00:00Z',
    commitSha: 'abc1234',
    baselineCommitSha: 'def5678',
    passed: true,
    perStrategy: [makeStrategyResult()],
    brokenQuestions: [],
    stability: undefined,
    cost: makeCost(),
    ...overrides,
  };
}

function makeFailingResult(overrides?: Partial<RegressionResult>): RegressionResult {
  return {
    tier: 'ci',
    timestamp: '2026-02-15T10:00:00Z',
    commitSha: 'abc1234',
    baselineCommitSha: 'def5678',
    passed: false,
    perStrategy: [
      makeStrategyResult(),
      makeStrategyResult({
        strategy: 'majority',
        dataset: 'truthfulqa',
        baselineAccuracy: 0.9,
        currentAccuracy: 0.75,
        delta: -0.15,
        pValue: 0.003,
        significant: true,
      }),
    ],
    brokenQuestions: [
      makeBrokenQuestion(),
      makeBrokenQuestion({
        questionId: 'q-99',
        dataset: 'truthfulqa',
        strategy: 'majority',
        groundTruth: 'Paris',
        baselineAnswer: 'Paris',
        currentAnswer: 'London',
      }),
    ],
    stability: undefined,
    cost: makeCost(),
    ...overrides,
  };
}

describe('createRegressionReport', () => {
  it('generates a passing report with no regressions', () => {
    const result = makePassingResult();
    const report = createRegressionReport(result);

    expect(report).toContain('# Regression Report');
    expect(report).toContain(':white_check_mark: **PASSED**');
    expect(report).toContain('`abc1234`');
    expect(report).toContain('`def5678`');
    expect(report).toContain('ci');
  });

  it('generates a failing report with regressions', () => {
    const result = makeFailingResult();
    const report = createRegressionReport(result);

    expect(report).toContain(':x: **FAILED**');
    expect(report).toContain('## Broken Questions');
    expect(report).toContain('q-42');
    expect(report).toContain('q-99');
  });

  it('renders accuracy table with correct structure', () => {
    const result = makePassingResult({
      perStrategy: [
        makeStrategyResult({ strategy: 'standard', dataset: 'gsm8k' }),
        makeStrategyResult({
          strategy: 'majority',
          dataset: 'gsm8k',
          baselineAccuracy: 0.7,
          currentAccuracy: 0.75,
          delta: 0.05,
          pValue: 0.1,
          significant: false,
        }),
      ],
    });
    const report = createRegressionReport(result);

    // Table header
    expect(report).toContain('| Strategy | Dataset | Baseline | Current | Delta | p-value | Status |');
    // Table separator
    expect(report).toContain('| --- |');
    // Row content
    expect(report).toContain('standard');
    expect(report).toContain('gsm8k');
    expect(report).toContain('80.0%');
    expect(report).toContain('85.0%');
  });

  it('formats percentages with 1 decimal place', () => {
    const result = makePassingResult({
      perStrategy: [
        makeStrategyResult({
          baselineAccuracy: 0.8333,
          currentAccuracy: 0.9167,
          delta: 0.0834,
        }),
      ],
    });
    const report = createRegressionReport(result);

    expect(report).toContain('83.3%');
    expect(report).toContain('91.7%');
    expect(report).toContain('+8.3%');
  });

  it('formats p-values with 3 decimal places', () => {
    const result = makePassingResult({
      perStrategy: [makeStrategyResult({ pValue: 0.0423 })],
    });
    const report = createRegressionReport(result);

    expect(report).toContain('0.042');
  });

  it('shows status indicator for significant regressions', () => {
    const result = makeFailingResult();
    const report = createRegressionReport(result);

    // The significant regression should show a fail indicator
    expect(report).toContain(':x:');
    // The non-significant row should show a pass indicator
    expect(report).toContain(':white_check_mark:');
  });

  it('shows pass indicator for significant improvements (positive delta)', () => {
    const result = makePassingResult({
      perStrategy: [
        makeStrategyResult({
          baselineAccuracy: 0.7,
          currentAccuracy: 0.9,
          delta: 0.2,
          pValue: 0.001,
          significant: true,
        }),
      ],
    });
    const report = createRegressionReport(result);

    // A significant improvement should NOT show a fail indicator
    const lines = report.split('\n');
    const accuracyRow = lines.find((l) => l.includes('standard') && l.includes('gsm8k'));
    expect(accuracyRow).toContain(':white_check_mark:');
    expect(accuracyRow).not.toContain(':x:');
  });

  it('includes broken questions section with full details', () => {
    const result = makeFailingResult();
    const report = createRegressionReport(result);

    expect(report).toContain('## Broken Questions');
    expect(report).toContain('q-42');
    expect(report).toContain('gsm8k');
    expect(report).toContain('standard');
    expect(report).toContain('42');
    expect(report).toContain('99');
    expect(report).toContain('q-99');
    expect(report).toContain('Paris');
    expect(report).toContain('London');
  });

  it('escapes pipe characters in broken question cells', () => {
    const result = makeFailingResult({
      brokenQuestions: [
        makeBrokenQuestion({
          questionId: 'q|1',
          groundTruth: 'a|b',
          baselineAnswer: 'a|b',
          currentAnswer: 'c|d',
        }),
      ],
    });
    const report = createRegressionReport(result);

    // Pipes in user content should be escaped so they don't break the table
    expect(report).toContain('q\\|1');
    expect(report).toContain('a\\|b');
    expect(report).toContain('c\\|d');
  });

  it('hides broken questions when includeDetails is false', () => {
    const result = makeFailingResult();
    const report = createRegressionReport(result, { includeDetails: false });

    expect(report).not.toContain('## Broken Questions');
    expect(report).not.toContain('q-42');
  });

  it('does not show broken questions section when there are none', () => {
    const result = makePassingResult();
    const report = createRegressionReport(result);

    expect(report).not.toContain('## Broken Questions');
  });

  it('includes changed files section when provided', () => {
    const result = makePassingResult();
    const report = createRegressionReport(result, {
      changedFiles: ['prompts/system.txt', 'prompts/grading.txt'],
    });

    expect(report).toContain('## Changed Files');
    expect(report).toContain('prompts/system.txt');
    expect(report).toContain('prompts/grading.txt');
  });

  it('omits changed files section when not provided', () => {
    const result = makePassingResult();
    const report = createRegressionReport(result);

    expect(report).not.toContain('## Changed Files');
  });

  it('omits changed files section when array is empty', () => {
    const result = makePassingResult();
    const report = createRegressionReport(result, { changedFiles: [] });

    expect(report).not.toContain('## Changed Files');
  });

  it('shows stability section for CI tier with stability data', () => {
    const stability: StabilityMetrics = {
      runsCompleted: 5,
      accuracyVariance: {
        standard: 0.0012,
        majority: 0.0008,
        elo: 0.0015,
      },
    };
    const result = makePassingResult({ stability });
    const report = createRegressionReport(result);

    expect(report).toContain('## Stability');
    expect(report).toContain('5');
    expect(report).toContain('standard');
    expect(report).toContain('majority');
    expect(report).toContain('elo');
  });

  it('omits stability section when stability is undefined', () => {
    const result = makePassingResult({ stability: undefined });
    const report = createRegressionReport(result);

    expect(report).not.toContain('## Stability');
  });

  it('formats cost section correctly', () => {
    const result = makePassingResult({
      cost: {
        totalTokens: 12500,
        totalCostUsd: 0.23,
        durationMs: 125000,
      },
    });
    const report = createRegressionReport(result);

    expect(report).toContain('## Cost');
    expect(report).toContain('12,500');
    expect(report).toContain('$0.23');
    expect(report).toContain('2m 5s');
  });

  it('formats duration with only seconds when under a minute', () => {
    const result = makePassingResult({
      cost: makeCost({ durationMs: 45000 }),
    });
    const report = createRegressionReport(result);

    expect(report).toContain('0m 45s');
  });

  it('formats duration with minutes and seconds', () => {
    const result = makePassingResult({
      cost: makeCost({ durationMs: 3661000 }),
    });
    const report = createRegressionReport(result);

    expect(report).toContain('61m 1s');
  });

  it('shows positive delta with + prefix', () => {
    const result = makePassingResult({
      perStrategy: [
        makeStrategyResult({
          baselineAccuracy: 0.8,
          currentAccuracy: 0.85,
          delta: 0.05,
        }),
      ],
    });
    const report = createRegressionReport(result);

    expect(report).toContain('+5.0%');
  });

  it('shows negative delta with - prefix', () => {
    const result = makeFailingResult();
    const report = createRegressionReport(result);

    expect(report).toContain('-15.0%');
  });

  it('shows zero delta without prefix', () => {
    const result = makePassingResult({
      perStrategy: [
        makeStrategyResult({
          baselineAccuracy: 0.8,
          currentAccuracy: 0.8,
          delta: 0,
        }),
      ],
    });
    const report = createRegressionReport(result);

    expect(report).toContain('0.0%');
  });

  it('formats post-merge tier correctly', () => {
    const result = makePassingResult({ tier: 'post-merge' });
    const report = createRegressionReport(result);

    expect(report).toContain('post-merge');
  });

  it('produces valid markdown table structure', () => {
    const result = makePassingResult({
      perStrategy: [
        makeStrategyResult(),
        makeStrategyResult({ strategy: 'majority', dataset: 'truthfulqa' }),
      ],
    });
    const report = createRegressionReport(result);

    const lines = report.split('\n');
    // Find the accuracy table header
    const headerIdx = lines.findIndex((l) => l.includes('| Strategy |'));
    expect(headerIdx).toBeGreaterThan(-1);

    // Next line should be separator
    const separator = lines[headerIdx + 1];
    expect(separator).toMatch(/^\|[\s-:|]+\|$/);

    // Following lines should be data rows
    const row1 = lines[headerIdx + 2];
    expect(row1).toMatch(/^\|/);
    expect(row1).toMatch(/\|$/);

    // Count pipes in header and rows to verify column count
    const headerPipes = (lines[headerIdx]!.match(/\|/g) ?? []).length;
    const row1Pipes = (row1!.match(/\|/g) ?? []).length;
    expect(headerPipes).toBe(row1Pipes);
  });
});
