import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createCompareCommand, buildComparisonResult } from './compare.js';
import type {
  BenchmarkResultsFile,
  ConsensusEvaluation,
  EvaluationResult,
  PromptRunResult,
  StrategyName,
} from '../types.js';

// ── Helpers ────────────────────────────────────────────────────────

function makeEvalResult(correct: boolean, expected = '42', predicted: string | null = '42'): EvaluationResult {
  return { correct, expected, predicted };
}

function makeConsensusEvaluation(
  results: Partial<Record<StrategyName, EvaluationResult>>,
): ConsensusEvaluation {
  return {
    evaluator: 'numeric',
    groundTruth: '42',
    results,
  };
}

function makeRun(
  questionId: string,
  strategyResults: Partial<Record<StrategyName, EvaluationResult>>,
): PromptRunResult {
  return {
    questionId,
    prompt: `Question ${questionId}`,
    groundTruth: '42',
    responses: [],
    consensus: {},
    consensusEvaluation: makeConsensusEvaluation(strategyResults),
  };
}

interface MinimalResultFile {
  dataset?: string;
  strategies?: StrategyName[];
  runs: PromptRunResult[];
}

function makeResultFile(overrides?: Partial<MinimalResultFile>): MinimalResultFile {
  return {
    dataset: 'gsm8k',
    strategies: ['standard'],
    runs: [],
    ...overrides,
  };
}

// ── buildComparisonResult tests ────────────────────────────────────

describe('buildComparisonResult', () => {
  it('computes accuracy and delta for matching questions', () => {
    const baseline = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(true) }),
        makeRun('q3', { standard: makeEvalResult(false, '42', '99') }),
        makeRun('q4', { standard: makeEvalResult(true) }),
      ],
    });
    const current = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(false, '42', '99') }),
        makeRun('q3', { standard: makeEvalResult(false, '42', '99') }),
        makeRun('q4', { standard: makeEvalResult(true) }),
      ],
    });

    const result = buildComparisonResult(baseline, current, { threshold: 0.05 });

    expect(result.perStrategy).toHaveLength(1);
    const strategy = result.perStrategy[0]!;
    expect(strategy.strategy).toBe('standard');
    expect(strategy.baselineAccuracy).toBe(0.75); // 3/4
    expect(strategy.currentAccuracy).toBe(0.5); // 2/4
    expect(strategy.delta).toBeCloseTo(-0.25);
  });

  it('identifies broken questions (correct in baseline, wrong in current)', () => {
    const baseline = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true, '42', '42') }),
        makeRun('q2', { standard: makeEvalResult(true, '10', '10') }),
      ],
    });
    const current = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(false, '42', '99') }),
        makeRun('q2', { standard: makeEvalResult(true, '10', '10') }),
      ],
    });

    const result = buildComparisonResult(baseline, current, { threshold: 0.05 });

    expect(result.brokenQuestions).toHaveLength(1);
    expect(result.brokenQuestions[0]).toMatchObject({
      questionId: 'q1',
      strategy: 'standard',
      groundTruth: '42',
      baselineAnswer: '42',
      currentAnswer: '99',
    });
  });

  it('throws when no matching question IDs exist', () => {
    const baseline = makeResultFile({
      runs: [makeRun('q1', { standard: makeEvalResult(true) })],
    });
    const current = makeResultFile({
      runs: [makeRun('q99', { standard: makeEvalResult(true) })],
    });

    expect(() =>
      buildComparisonResult(baseline, current, { threshold: 0.05 }),
    ).toThrow('No matching question IDs');
  });

  it('handles multiple strategies', () => {
    const baseline = makeResultFile({
      strategies: ['standard', 'majority'],
      runs: [
        makeRun('q1', {
          standard: makeEvalResult(true),
          majority: makeEvalResult(true),
        }),
        makeRun('q2', {
          standard: makeEvalResult(true),
          majority: makeEvalResult(false, '42', '99'),
        }),
      ],
    });
    const current = makeResultFile({
      strategies: ['standard', 'majority'],
      runs: [
        makeRun('q1', {
          standard: makeEvalResult(true),
          majority: makeEvalResult(true),
        }),
        makeRun('q2', {
          standard: makeEvalResult(false, '42', '99'),
          majority: makeEvalResult(false, '42', '99'),
        }),
      ],
    });

    const result = buildComparisonResult(baseline, current, { threshold: 0.05 });

    expect(result.perStrategy).toHaveLength(2);
    const standardResult = result.perStrategy.find((s) => s.strategy === 'standard');
    const majorityResult = result.perStrategy.find((s) => s.strategy === 'majority');

    expect(standardResult?.baselineAccuracy).toBe(1);
    expect(standardResult?.currentAccuracy).toBe(0.5);
    expect(majorityResult?.baselineAccuracy).toBe(0.5);
    expect(majorityResult?.currentAccuracy).toBe(0.5);
  });

  it('marks result as passed when no significant regressions', () => {
    const baseline = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(true) }),
      ],
    });
    const current = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(true) }),
      ],
    });

    const result = buildComparisonResult(baseline, current, { threshold: 0.05 });

    expect(result.passed).toBe(true);
  });

  it('only considers overlapping question IDs', () => {
    const baseline = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(true) }),
        makeRun('q3', { standard: makeEvalResult(false, '42', '99') }),
      ],
    });
    const current = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(true) }),
        makeRun('q50', { standard: makeEvalResult(false, '42', '99') }),
      ],
    });

    const result = buildComparisonResult(baseline, current, { threshold: 0.05 });

    // Only q1 and q2 match, both correct in both
    const strategy = result.perStrategy[0]!;
    expect(strategy.baselineAccuracy).toBe(1);
    expect(strategy.currentAccuracy).toBe(1);
  });

  it('skips strategies missing from one side for a given question', () => {
    const baseline = makeResultFile({
      strategies: ['standard', 'majority'],
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
      ],
    });
    const current = makeResultFile({
      strategies: ['standard', 'majority'],
      runs: [
        makeRun('q1', {
          standard: makeEvalResult(true),
          majority: makeEvalResult(true),
        }),
      ],
    });

    const result = buildComparisonResult(baseline, current, { threshold: 0.05 });

    // majority should not appear since baseline q1 has no majority result
    const majorityResult = result.perStrategy.find((s) => s.strategy === 'majority');
    expect(majorityResult).toBeUndefined();
  });

  it('computes Fisher exact p-value', () => {
    const baseline = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(true) }),
      ],
    });
    const current = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(true) }),
      ],
    });

    const result = buildComparisonResult(baseline, current, { threshold: 0.05 });

    // Both have same accuracy, p-value should be 1
    expect(result.perStrategy[0]!.pValue).toBe(1);
  });

  it('uses dataset name from baseline file', () => {
    const baseline = makeResultFile({ dataset: 'truthfulqa', runs: [makeRun('q1', { standard: makeEvalResult(true) })] });
    const current = makeResultFile({ runs: [makeRun('q1', { standard: makeEvalResult(true) })] });

    const result = buildComparisonResult(baseline, current, { threshold: 0.05 });

    expect(result.perStrategy[0]!.dataset).toBe('truthfulqa');
  });
});

// ── CLI command tests ──────────────────────────────────────────────

describe('createCompareCommand', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutSpy: any;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('creates a command named "compare"', () => {
    const cmd = createCompareCommand();
    expect(cmd.name()).toBe('compare');
  });

  it('accepts two positional arguments', () => {
    const cmd = createCompareCommand();
    // Commander stores registered arguments
    expect(cmd.registeredArguments).toHaveLength(2);
  });

  it('has a --report option', () => {
    const cmd = createCompareCommand();
    const reportOption = cmd.options.find((o) => o.long === '--report');
    expect(reportOption).toBeDefined();
  });

  it('has a --threshold option with default 0.05', () => {
    const cmd = createCompareCommand();
    const thresholdOption = cmd.options.find((o) => o.long === '--threshold');
    expect(thresholdOption).toBeDefined();
    expect(thresholdOption!.defaultValue).toBe('0.05');
  });

  it('outputs report to stdout when --report is not specified', async () => {
    const { readJsonFile } = await import('../lib/io.js');
    const ioModule = await import('../lib/io.js');

    const baselineData = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(true) }),
      ],
    });
    const currentData = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
        makeRun('q2', { standard: makeEvalResult(false, '42', '99') }),
      ],
    });

    vi.spyOn(ioModule, 'readJsonFile').mockImplementation(async (path: string) => {
      if (path === 'current.json') return currentData;
      if (path === 'baseline.json') return baselineData;
      throw new Error(`Unexpected path: ${path}`);
    });

    const cmd = createCompareCommand();
    await cmd.parseAsync(['node', 'test', 'current.json', 'baseline.json']);

    const output = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(output).toContain('# Regression Report');
    expect(output).toContain('## Accuracy');
  });

  it('writes report to file when --report is specified', async () => {
    const ioModule = await import('../lib/io.js');

    const baselineData = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
      ],
    });
    const currentData = makeResultFile({
      runs: [
        makeRun('q1', { standard: makeEvalResult(true) }),
      ],
    });

    vi.spyOn(ioModule, 'readJsonFile').mockImplementation(async (path: string) => {
      if (path === 'current.json') return currentData;
      if (path === 'baseline.json') return baselineData;
      throw new Error(`Unexpected path: ${path}`);
    });

    const writeTextSpy = vi.spyOn(ioModule, 'writeTextFile').mockResolvedValue();

    const cmd = createCompareCommand();
    await cmd.parseAsync(['node', 'test', 'current.json', 'baseline.json', '--report', 'out.md']);

    expect(writeTextSpy).toHaveBeenCalledOnce();
    expect(writeTextSpy).toHaveBeenCalledWith('out.md', expect.stringContaining('# Regression Report'));

    const stdoutOutput = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(stdoutOutput).toContain('Regression report written to out.md');
  });

  it('throws error when current file cannot be loaded', async () => {
    const ioModule = await import('../lib/io.js');

    vi.spyOn(ioModule, 'readJsonFile').mockRejectedValue(
      new Error('ENOENT: no such file'),
    );

    const cmd = createCompareCommand();
    await expect(
      cmd.parseAsync(['node', 'test', 'missing.json', 'baseline.json']),
    ).rejects.toThrow('Failed to load current results from "missing.json"');
  });

  it('throws error when baseline file cannot be loaded', async () => {
    const ioModule = await import('../lib/io.js');

    const currentData = makeResultFile({ runs: [] });

    vi.spyOn(ioModule, 'readJsonFile').mockImplementation(async (path: string) => {
      if (path === 'current.json') return currentData;
      throw new Error('ENOENT: no such file');
    });

    const cmd = createCompareCommand();
    await expect(
      cmd.parseAsync(['node', 'test', 'current.json', 'baseline.json']),
    ).rejects.toThrow('Failed to load baseline results from "baseline.json"');
  });

  it('throws error when current file has no runs array', async () => {
    const ioModule = await import('../lib/io.js');

    vi.spyOn(ioModule, 'readJsonFile').mockImplementation(async (path: string) => {
      if (path === 'current.json') return { dataset: 'gsm8k' };
      return makeResultFile({ runs: [] });
    });

    const cmd = createCompareCommand();
    await expect(
      cmd.parseAsync(['node', 'test', 'current.json', 'baseline.json']),
    ).rejects.toThrow('does not contain a valid "runs" array');
  });

  it('throws error when baseline file has no runs array', async () => {
    const ioModule = await import('../lib/io.js');

    vi.spyOn(ioModule, 'readJsonFile').mockImplementation(async (path: string) => {
      if (path === 'current.json') return makeResultFile({ runs: [] });
      return { dataset: 'gsm8k' };
    });

    const cmd = createCompareCommand();
    await expect(
      cmd.parseAsync(['node', 'test', 'current.json', 'baseline.json']),
    ).rejects.toThrow('does not contain a valid "runs" array');
  });
});
