import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUpdateBaselineCommand, buildGoldenBaseline, getGitCommitSha } from './updateBaseline.js';
import type { TierConfig, GoldenBaselineFile } from '../lib/regressionTypes.js';
import type { BenchmarkDatasetName, BenchmarkQuestion } from '../types.js';

vi.mock('../lib/providers.js', () => ({
  registerProviders: vi.fn(),
}));

vi.mock('../lib/questionPinning.js', () => ({
  pinQuestionsForBaseline: vi.fn(),
}));

vi.mock('../lib/tierConfig.js', () => ({
  getTierConfig: vi.fn(),
}));

vi.mock('../lib/io.js', () => ({
  writeJsonFile: vi.fn(),
  fileExists: vi.fn().mockResolvedValue(false),
  readJsonFile: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn().mockReturnValue(Buffer.from('abc123def456\n')),
}));

const mockTierConfig: TierConfig = {
  name: 'ci',
  datasets: [{ name: 'gsm8k', sampleSize: 2 }],
  models: [{ provider: 'openai', model: 'gpt-4o-mini' }],
  strategies: ['standard'],
  runs: 1,
  requestDelayMs: 0,
  significanceThreshold: 0.1,
  summarizer: { provider: 'openai', model: 'gpt-4o-mini' },
};

const mockQuestions: BenchmarkQuestion[] = [
  { id: 'gsm8k-0', prompt: 'What is 2+2?', groundTruth: '4' },
  { id: 'gsm8k-1', prompt: 'What is 3+3?', groundTruth: '6' },
];

function createMockProvider() {
  return {
    streamResponse: async (
      _prompt: string,
      _model: string,
      _onChunk: (chunk: string) => void,
      onComplete: (content: string, time: number, tokens: number) => void,
    ) => {
      onComplete('4', 10, 50);
    },
    generateEmbeddings: async () => [],
    validateApiKey: async () => ({ valid: true }),
    listAvailableModels: () => [
      {
        id: 'gpt-4o-mini',
        name: 'gpt-4o-mini',
        provider: 'openai',
        contextWindow: 128_000,
        costPer1kTokens: 0.001,
      },
    ],
    listAvailableTextModels: async () => ['gpt-4o-mini'],
  };
}

async function setupProviderMock() {
  const { registerProviders } = await import('../lib/providers.js');
  vi.mocked(registerProviders).mockImplementation(() => {});

  const { ProviderRegistry } = await import(
    '@ensemble-ai/shared-utils/providers'
  );
  vi.spyOn(ProviderRegistry.prototype, 'getProvider').mockReturnValue(
    createMockProvider() as never,
  );
}

describe('createUpdateBaselineCommand', () => {
  it('creates a command named "update-baseline"', () => {
    const command = createUpdateBaselineCommand();
    expect(command.name()).toBe('update-baseline');
  });

  it('requires --tier option', () => {
    const command = createUpdateBaselineCommand();
    const tierOption = command.options.find(
      (opt) => opt.long === '--tier',
    );
    expect(tierOption).toBeDefined();
    expect(tierOption!.required).toBe(true);
  });

  it('has optional --output option', () => {
    const command = createUpdateBaselineCommand();
    const outputOption = command.options.find(
      (opt) => opt.long === '--output',
    );
    expect(outputOption).toBeDefined();
  });

  it('has --mode option defaulting to "free"', () => {
    const command = createUpdateBaselineCommand();
    const modeOption = command.options.find(
      (opt) => opt.long === '--mode',
    );
    expect(modeOption).toBeDefined();
    expect(modeOption!.defaultValue).toBe('free');
  });
});

describe('getGitCommitSha', () => {
  it('returns trimmed commit SHA from git rev-parse HEAD', () => {
    const sha = getGitCommitSha();
    expect(sha).toBe('abc123def456');
  });
});

describe('buildGoldenBaseline', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await setupProviderMock();
  });

  it('builds a GoldenBaselineFile with correct structure', async () => {
    const pinnedQuestions = new Map<BenchmarkDatasetName, BenchmarkQuestion[]>();
    pinnedQuestions.set('gsm8k', mockQuestions);

    const baseline = await buildGoldenBaseline(
      mockTierConfig,
      pinnedQuestions,
      'mock',
      'abc123',
    );

    expect(baseline.tier).toBe('ci');
    expect(baseline.commitSha).toBe('abc123');
    expect(baseline.config).toBe(mockTierConfig);
    expect(baseline.questionIds).toHaveLength(2);
    expect(baseline.questionIds).toContain('gsm8k-0');
    expect(baseline.questionIds).toContain('gsm8k-1');
    expect(baseline.results).toHaveLength(2);
    expect(baseline.createdAt).toBeDefined();
    expect(Number.isNaN(Date.parse(baseline.createdAt))).toBe(false);
  });

  it('produces BaselineQuestionResult entries with correct fields', async () => {
    const pinnedQuestions = new Map<BenchmarkDatasetName, BenchmarkQuestion[]>();
    pinnedQuestions.set('gsm8k', [mockQuestions[0]]);

    const baseline = await buildGoldenBaseline(
      mockTierConfig,
      pinnedQuestions,
      'mock',
      'def456',
    );

    const result = baseline.results[0];
    expect(result.questionId).toBe('gsm8k-0');
    expect(result.dataset).toBe('gsm8k');
    expect(result.groundTruth).toBe('4');
    expect(result.modelResults).toBeDefined();
    expect(result.consensusResults).toBeDefined();
  });

  it('skips datasets with no pinned questions', async () => {
    const pinnedQuestions = new Map<BenchmarkDatasetName, BenchmarkQuestion[]>();
    // Empty map: no questions for any dataset

    const baseline = await buildGoldenBaseline(
      mockTierConfig,
      pinnedQuestions,
      'mock',
      'empty-sha',
    );

    expect(baseline.results).toHaveLength(0);
    expect(baseline.questionIds).toHaveLength(0);
  });
});

describe('update-baseline CLI integration', () => {
  let scratchDir = '';

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-establish the child_process mock since clearAllMocks clears implementations
    const childProcess = await import('node:child_process');
    vi.mocked(childProcess.execSync).mockReturnValue(
      Buffer.from('abc123def456\n'),
    );

    await setupProviderMock();
  });

  afterEach(async () => {
    if (scratchDir) {
      await rm(scratchDir, { recursive: true, force: true });
      scratchDir = '';
    }
  });

  it('writes baseline JSON to specified output path', async () => {
    scratchDir = await mkdtemp(join(tmpdir(), 'ensemble-update-baseline-'));
    const outputPath = join(scratchDir, 'baseline.json');

    const { getTierConfig } = await import('../lib/tierConfig.js');
    const { pinQuestionsForBaseline } = await import(
      '../lib/questionPinning.js'
    );
    const { writeJsonFile } = await import('../lib/io.js');

    vi.mocked(getTierConfig).mockReturnValue(mockTierConfig);
    vi.mocked(pinQuestionsForBaseline).mockResolvedValue(
      new Map([['gsm8k', mockQuestions]]),
    );

    const writtenFiles: Array<{ path: string; data: unknown }> = [];
    vi.mocked(writeJsonFile).mockImplementation(async (path, data) => {
      writtenFiles.push({ path, data });
    });

    const command = createUpdateBaselineCommand();
    await command.parseAsync([
      'node',
      'test',
      '--tier',
      'ci',
      '--output',
      outputPath,
      '--mode',
      'mock',
    ]);

    // writeJsonFile is called for each BenchmarkRunner checkpoint and then the final baseline
    const baselineWrite = writtenFiles.find(
      (w) => w.path === outputPath,
    );
    expect(baselineWrite).toBeDefined();

    const baseline = baselineWrite!.data as GoldenBaselineFile;
    expect(baseline.tier).toBe('ci');
    expect(baseline.commitSha).toBe('abc123def456');
    expect(baseline.questionIds).toHaveLength(2);
    expect(baseline.results).toHaveLength(2);
  });

  it('uses default output path when --output is not specified', async () => {
    const { getTierConfig } = await import('../lib/tierConfig.js');
    const { pinQuestionsForBaseline } = await import(
      '../lib/questionPinning.js'
    );
    const { writeJsonFile } = await import('../lib/io.js');

    vi.mocked(getTierConfig).mockReturnValue({
      ...mockTierConfig,
      name: 'post-merge',
    });
    vi.mocked(pinQuestionsForBaseline).mockResolvedValue(
      new Map([['gsm8k', mockQuestions]]),
    );

    const writtenFiles: Array<{ path: string; data: unknown }> = [];
    vi.mocked(writeJsonFile).mockImplementation(async (path, data) => {
      writtenFiles.push({ path, data });
    });

    const command = createUpdateBaselineCommand();
    await command.parseAsync([
      'node',
      'test',
      '--tier',
      'post-merge',
      '--mode',
      'mock',
    ]);

    // The default path for post-merge tier
    const baselineWrite = writtenFiles.find(
      (w) => w.path === 'baselines/golden-post-merge.json',
    );
    expect(baselineWrite).toBeDefined();
  });

  it('calls getTierConfig with the correct tier', async () => {
    const { getTierConfig } = await import('../lib/tierConfig.js');
    const { pinQuestionsForBaseline } = await import(
      '../lib/questionPinning.js'
    );
    const { writeJsonFile } = await import('../lib/io.js');

    vi.mocked(getTierConfig).mockReturnValue(mockTierConfig);
    vi.mocked(pinQuestionsForBaseline).mockResolvedValue(
      new Map([['gsm8k', mockQuestions]]),
    );
    vi.mocked(writeJsonFile).mockResolvedValue();

    const command = createUpdateBaselineCommand();
    await command.parseAsync([
      'node',
      'test',
      '--tier',
      'ci',
      '--mode',
      'mock',
    ]);

    expect(getTierConfig).toHaveBeenCalledWith('ci');
  });

  it('calls pinQuestionsForBaseline with the tier config', async () => {
    const { getTierConfig } = await import('../lib/tierConfig.js');
    const { pinQuestionsForBaseline } = await import(
      '../lib/questionPinning.js'
    );
    const { writeJsonFile } = await import('../lib/io.js');

    vi.mocked(getTierConfig).mockReturnValue(mockTierConfig);
    vi.mocked(pinQuestionsForBaseline).mockResolvedValue(
      new Map([['gsm8k', mockQuestions]]),
    );
    vi.mocked(writeJsonFile).mockResolvedValue();

    const command = createUpdateBaselineCommand();
    await command.parseAsync([
      'node',
      'test',
      '--tier',
      'ci',
      '--mode',
      'mock',
    ]);

    expect(pinQuestionsForBaseline).toHaveBeenCalledWith(mockTierConfig);
  });
});
