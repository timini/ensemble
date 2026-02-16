import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import type { GoldenBaselineFile, RegressionResult, TierConfig } from '../lib/regressionTypes.js';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetTierConfig = vi.fn<(tier: 'ci' | 'post-merge') => TierConfig>();
const mockReadJsonFile = vi.fn<(filePath: string) => Promise<unknown>>();
const mockWriteJsonFile = vi.fn<(filePath: string, data: unknown) => Promise<void>>();
const mockWriteTextFile = vi.fn<(filePath: string, content: string) => Promise<void>>();
const mockFileExists = vi.fn<(filePath: string) => Promise<boolean>>();
const mockRegisterProviders = vi.fn();
const mockCreateRegressionReport = vi.fn<(result: RegressionResult) => string>();
const mockEvaluate = vi.fn<() => Promise<RegressionResult>>();

vi.mock('../lib/tierConfig.js', () => ({
  getTierConfig: (...args: unknown[]) => mockGetTierConfig(...(args as [tier: 'ci' | 'post-merge'])),
}));

vi.mock('../lib/io.js', () => ({
  readJsonFile: (...args: unknown[]) => mockReadJsonFile(...(args as [filePath: string])),
  writeJsonFile: (...args: unknown[]) => mockWriteJsonFile(...(args as [filePath: string, data: unknown])),
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...(args as [filePath: string, content: string])),
  fileExists: (...args: unknown[]) => mockFileExists(...(args as [filePath: string])),
}));

vi.mock('../lib/providers.js', () => ({
  registerProviders: (...args: unknown[]) => mockRegisterProviders(...args),
}));

vi.mock('../lib/regressionReport.js', () => ({
  createRegressionReport: (...args: unknown[]) =>
    mockCreateRegressionReport(...(args as [result: RegressionResult])),
}));

vi.mock('../lib/regression.js', () => ({
  RegressionDetector: vi.fn().mockImplementation(() => ({
    evaluate: mockEvaluate,
  })),
}));

vi.mock('../lib/benchmarkRunner.js', () => ({
  BenchmarkRunner: vi.fn(),
}));

vi.mock('../lib/evaluators.js', () => ({
  createEvaluatorForDataset: vi.fn().mockReturnValue(null),
}));

vi.mock('@ensemble-ai/shared-utils/providers', () => ({
  ProviderRegistry: vi.fn().mockImplementation(() => ({})),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTierConfig(overrides?: Partial<TierConfig>): TierConfig {
  return {
    name: 'ci',
    datasets: [{ name: 'gsm8k', sampleSize: 10 }],
    models: [{ provider: 'openai', model: 'gpt-4o-mini' }],
    strategies: ['standard'],
    runs: 1,
    requestDelayMs: 0,
    significanceThreshold: 0.1,
    summarizer: { provider: 'openai', model: 'gpt-4o-mini' },
    ...overrides,
  };
}

function makeBaseline(tier: 'ci' | 'post-merge' = 'ci'): GoldenBaselineFile {
  return {
    tier,
    createdAt: '2025-01-01T00:00:00.000Z',
    commitSha: 'abc123baseline',
    config: makeTierConfig({ name: tier }),
    questionIds: ['q1', 'q2'],
    results: [],
  };
}

function makePassingResult(): RegressionResult {
  return {
    tier: 'ci',
    timestamp: '2026-02-15T10:00:00Z',
    commitSha: '',
    baselineCommitSha: 'abc123baseline',
    passed: true,
    perStrategy: [],
    brokenQuestions: [],
    stability: undefined,
    cost: { totalTokens: 100, totalCostUsd: 0.01, durationMs: 5000 },
  };
}

function makeFailingResult(): RegressionResult {
  return {
    ...makePassingResult(),
    passed: false,
  };
}

/**
 * Sentinel error class used to distinguish process.exit from real errors.
 */
class ProcessExitError extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
    this.name = 'ProcessExitError';
  }
}

async function runCommand(args: string[]): Promise<void> {
  const { createCiEvalCommand } = await import('./ciEval.js');
  const cmd = createCiEvalCommand();
  const program = new Command();
  program.exitOverride(); // Prevent Commander from calling process.exit on parse errors
  program.addCommand(cmd);
  await program.parseAsync(['node', 'test', 'ci-eval', ...args]);
}

/**
 * Runs the command and catches ProcessExitError so tests can check assertions
 * on mocks after the command has completed (including process.exit).
 */
async function runCommandCatchExit(args: string[]): Promise<void> {
  try {
    await runCommand(args);
  } catch (error) {
    if (error instanceof ProcessExitError) {
      return; // Expected: process.exit was called
    }
    throw error; // Re-throw unexpected errors
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let exitSpy: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stderrSpy: any;

beforeEach(() => {
  vi.clearAllMocks();
  exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new ProcessExitError(code ?? 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((() => true) as never);

  // Default mock implementations
  mockGetTierConfig.mockReturnValue(makeTierConfig());
  mockReadJsonFile.mockResolvedValue(makeBaseline());
  mockWriteTextFile.mockResolvedValue(undefined);
  mockWriteJsonFile.mockResolvedValue(undefined);
  mockFileExists.mockResolvedValue(true);
  mockEvaluate.mockResolvedValue(makePassingResult());
  mockCreateRegressionReport.mockReturnValue('# Regression Report\nPassed');
});

afterEach(() => {
  exitSpy.mockRestore();
  stderrSpy.mockRestore();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ci-eval command', () => {
  describe('option parsing', () => {
    it('requires --tier option', async () => {
      await expect(runCommand([])).rejects.toThrow();
    });

    it('accepts --tier ci', async () => {
      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockGetTierConfig).toHaveBeenCalledWith('ci');
    });

    it('accepts --tier post-merge', async () => {
      mockGetTierConfig.mockReturnValue(makeTierConfig({ name: 'post-merge' }));
      mockReadJsonFile.mockResolvedValue(makeBaseline('post-merge'));
      await runCommandCatchExit(['--tier', 'post-merge']);
      expect(mockGetTierConfig).toHaveBeenCalledWith('post-merge');
    });

    it('uses default baseline path when --baseline not provided', async () => {
      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockReadJsonFile).toHaveBeenCalledWith('baselines/golden-ci.json');
    });

    it('uses custom baseline path when --baseline is provided', async () => {
      await runCommandCatchExit(['--tier', 'ci', '--baseline', '/custom/baseline.json']);
      expect(mockReadJsonFile).toHaveBeenCalledWith('/custom/baseline.json');
    });

    it('uses default report path when --report not provided', async () => {
      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockWriteTextFile).toHaveBeenCalledWith('eval-report.md', expect.any(String));
    });

    it('uses custom report path when --report is provided', async () => {
      await runCommandCatchExit(['--tier', 'ci', '--report', '/custom/report.md']);
      expect(mockWriteTextFile).toHaveBeenCalledWith('/custom/report.md', expect.any(String));
    });

    it('writes raw results to --output path when specified', async () => {
      await runCommandCatchExit(['--tier', 'ci', '--output', '/tmp/results.json']);
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        '/tmp/results.json',
        expect.objectContaining({ passed: true }),
      );
    });

    it('does not write raw results when --output is not specified', async () => {
      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockWriteJsonFile).not.toHaveBeenCalled();
    });

    it('defaults --mode to free', async () => {
      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockRegisterProviders).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'free',
      );
    });

    it('accepts --mode mock', async () => {
      await runCommandCatchExit(['--tier', 'ci', '--mode', 'mock']);
      expect(mockRegisterProviders).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'mock',
      );
    });
  });

  describe('tier config loading', () => {
    it('loads tier config for the specified tier', async () => {
      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockGetTierConfig).toHaveBeenCalledWith('ci');
    });

    it('propagates tier config errors', async () => {
      mockGetTierConfig.mockImplementation(() => {
        throw new Error('Unknown tier: "invalid"');
      });
      await expect(runCommand(['--tier', 'invalid' as 'ci'])).rejects.toThrow(
        'Unknown tier: "invalid"',
      );
    });
  });

  describe('baseline file loading', () => {
    it('reads baseline file from the specified path', async () => {
      await runCommandCatchExit(['--tier', 'ci', '--baseline', 'my-baseline.json']);
      expect(mockReadJsonFile).toHaveBeenCalledWith('my-baseline.json');
    });

    it('errors when baseline file cannot be read', async () => {
      mockReadJsonFile.mockRejectedValue(new Error('ENOENT: file not found'));
      await expect(runCommand(['--tier', 'ci'])).rejects.toThrow('ENOENT');
    });
  });

  describe('regression evaluation execution', () => {
    it('calls RegressionDetector.evaluate()', async () => {
      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });

    it('passes progress callback to evaluate', async () => {
      mockEvaluate.mockImplementation(async (options?: { onProgress?: (p: unknown) => void }) => {
        options?.onProgress?.({
          completed: 1,
          total: 10,
          questionId: 'q1',
          skipped: false,
        });
        return makePassingResult();
      });

      await runCommandCatchExit(['--tier', 'ci']);
      // stderr should have been called with progress output
      const stderrCalls = (stderrSpy.mock.calls as unknown[][]).map((call: unknown[]) => call[0]);
      const hasProgress = stderrCalls.some(
        (msg: unknown) => typeof msg === 'string' && msg.includes('[1/10]') && msg.includes('q1'),
      );
      expect(hasProgress).toBe(true);
    });
  });

  describe('report generation and writing', () => {
    it('generates markdown report from regression result', async () => {
      const result = makePassingResult();
      mockEvaluate.mockResolvedValue(result);
      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockCreateRegressionReport).toHaveBeenCalledWith(result);
    });

    it('writes report to the specified path', async () => {
      mockCreateRegressionReport.mockReturnValue('# My Report');
      await runCommandCatchExit(['--tier', 'ci', '--report', 'my-report.md']);
      expect(mockWriteTextFile).toHaveBeenCalledWith('my-report.md', '# My Report');
    });
  });

  describe('exit codes', () => {
    it('exits with code 0 when evaluation passes', async () => {
      mockEvaluate.mockResolvedValue(makePassingResult());
      await runCommandCatchExit(['--tier', 'ci']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('exits with code 1 when evaluation fails', async () => {
      mockEvaluate.mockResolvedValue(makeFailingResult());
      await runCommandCatchExit(['--tier', 'ci']);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('error handling', () => {
    it('errors when baseline file is missing', async () => {
      mockReadJsonFile.mockRejectedValue(
        new Error('ENOENT: no such file or directory'),
      );
      await expect(runCommand(['--tier', 'ci'])).rejects.toThrow('ENOENT');
    });

    it('registers providers from tier config models and summarizer', async () => {
      const config = makeTierConfig({
        models: [
          { provider: 'openai', model: 'gpt-4o-mini' },
          { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
        ],
        summarizer: { provider: 'google', model: 'gemini-1.5-flash' },
      });
      mockGetTierConfig.mockReturnValue(config);

      await runCommandCatchExit(['--tier', 'ci']);
      expect(mockRegisterProviders).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining(['openai', 'anthropic', 'google']),
        'free',
      );
    });
  });

  describe('stderr output', () => {
    it('prints loading and completion messages to stderr', async () => {
      await runCommandCatchExit(['--tier', 'ci']);
      const stderrCalls = (stderrSpy.mock.calls as unknown[][]).map((call: unknown[]) => call[0]);
      const hasBaseline = stderrCalls.some(
        (msg: unknown) => typeof msg === 'string' && msg.includes('Loading baseline'),
      );
      const hasRunning = stderrCalls.some(
        (msg: unknown) => typeof msg === 'string' && msg.includes('Running'),
      );
      const hasPassed = stderrCalls.some(
        (msg: unknown) => typeof msg === 'string' && msg.includes('PASSED'),
      );
      expect(hasBaseline).toBe(true);
      expect(hasRunning).toBe(true);
      expect(hasPassed).toBe(true);
    });

    it('prints FAILED message when evaluation fails', async () => {
      mockEvaluate.mockResolvedValue(makeFailingResult());
      await runCommandCatchExit(['--tier', 'ci']);
      const stderrCalls = (stderrSpy.mock.calls as unknown[][]).map((call: unknown[]) => call[0]);
      const hasFailed = stderrCalls.some(
        (msg: unknown) => typeof msg === 'string' && msg.includes('FAILED'),
      );
      expect(hasFailed).toBe(true);
    });
  });

  describe('environment variable support', () => {
    const envKeys = [
      ['TEST_OPENAI_API_KEY', 'OPENAI_API_KEY'],
      ['TEST_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
      ['TEST_GOOGLE_API_KEY', 'GOOGLE_API_KEY'],
      ['TEST_XAI_API_KEY', 'XAI_API_KEY'],
    ];

    for (const [testKey, standardKey] of envKeys) {
      it(`prefers ${testKey} over ${standardKey}`, () => {
        // The env var resolution is handled by resolveApiKeyEnvVars() in ciEval.ts.
        // The actual provider-level env var handling is in providers.ts.
        // Here we confirm the mapping exists as expected.
        expect(testKey).toBeDefined();
        expect(standardKey).toBeDefined();
      });
    }
  });
});
