import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createBenchmarkCommand } from './benchmark.js';

vi.mock('../lib/benchmarkDatasets.js', () => ({
  loadBenchmarkQuestions: vi.fn(),
}));

vi.mock('../lib/evaluators.js', () => ({
  createEvaluatorForDataset: vi.fn(),
}));

vi.mock('../lib/io.js', () => ({
  fileExists: vi.fn().mockResolvedValue(false),
  readJsonFile: vi.fn(),
}));

vi.mock('./benchmarkOutput.js', () => ({
  createBenchmarkFile: vi.fn(),
  assertValidResumedOutput: vi.fn(),
}));

vi.mock('../lib/providers.js', () => ({
  registerProviders: vi.fn(),
}));

vi.mock('../lib/benchmarkRunner.js', () => {
  const BenchmarkRunner = vi.fn();
  BenchmarkRunner.prototype.run = vi.fn();
  return { BenchmarkRunner };
});

import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { createEvaluatorForDataset } from '../lib/evaluators.js';
import { fileExists, readJsonFile } from '../lib/io.js';
import { createBenchmarkFile, assertValidResumedOutput } from './benchmarkOutput.js';
import { registerProviders } from '../lib/providers.js';
import { BenchmarkRunner } from '../lib/benchmarkRunner.js';
import type { BenchmarkResultsFile } from '../types.js';

const mockLoadBenchmarkQuestions = vi.mocked(loadBenchmarkQuestions);
const mockCreateEvaluatorForDataset = vi.mocked(createEvaluatorForDataset);
const mockFileExists = vi.mocked(fileExists);
const mockReadJsonFile = vi.mocked(readJsonFile);
const mockCreateBenchmarkFile = vi.mocked(createBenchmarkFile);
const mockRegisterProviders = vi.mocked(registerProviders);
const MockBenchmarkRunner = vi.mocked(BenchmarkRunner);
const mockRunnerRun = BenchmarkRunner.prototype.run as unknown as ReturnType<typeof vi.fn>;

function makeOutputFile(): BenchmarkResultsFile {
  return {
    type: 'benchmark',
    dataset: 'gsm8k',
    mode: 'mock',
    models: ['openai:gpt-4o'],
    strategies: ['standard'],
    sampleSize: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runs: [],
  };
}

function setupDefaults(): void {
  mockLoadBenchmarkQuestions.mockResolvedValue({
    datasetName: 'gsm8k',
    questions: [{ id: 'gsm8k-0', prompt: 'What is 1+1?', groundTruth: '2' }],
  });
  mockCreateEvaluatorForDataset.mockReturnValue(null);
  mockCreateBenchmarkFile.mockReturnValue(makeOutputFile());
  mockRunnerRun.mockResolvedValue(makeOutputFile());
}

async function runCommand(args: string[]): Promise<void> {
  const command = createBenchmarkCommand();
  command.exitOverride();
  await command.parseAsync(['node', 'benchmark', ...args]);
}

describe('benchmark command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setupDefaults();
  });

  describe('argument parsing', () => {
    it('parses required --models and dataset argument', async () => {
      await runCommand(['gsm8k', '--models', 'openai:gpt-4o', '--output', 'out.json']);

      expect(mockLoadBenchmarkQuestions).toHaveBeenCalledWith('gsm8k', { sample: 10 });
      expect(MockBenchmarkRunner).toHaveBeenCalledTimes(1);
      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.models).toEqual([{ provider: 'openai', model: 'gpt-4o' }]);
    });

    it('parses multiple models via comma-separated values', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o,anthropic:claude-3',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.models).toEqual([
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'anthropic', model: 'claude-3' },
      ]);
    });

    it('parses multiple models via repeated --models', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o', 'anthropic:claude-3',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.models).toHaveLength(2);
    });

    it('parses --strategies option', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--strategies', 'elo', 'majority',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.strategies).toEqual(['elo', 'majority']);
    });

    it('defaults strategies to standard when not provided', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.strategies).toEqual(['standard']);
    });

    it('parses --sample option', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--sample', '5',
        '--output', 'out.json',
      ]);

      expect(mockLoadBenchmarkQuestions).toHaveBeenCalledWith('gsm8k', { sample: 5 });
    });

    it('defaults sample count to 10', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--output', 'out.json',
      ]);

      expect(mockLoadBenchmarkQuestions).toHaveBeenCalledWith('gsm8k', { sample: 10 });
    });

    it('parses --summarizer option', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--summarizer', 'anthropic:claude-3',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.summarizer).toEqual({ provider: 'anthropic', model: 'claude-3' });
    });

    it('parses --request-delay-ms option', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--request-delay-ms', '200',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.requestDelayMs).toBe(200);
    });

    it('parses --temperature option', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--temperature', '0.7',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.temperature).toBeCloseTo(0.7);
    });

    it('parses --mode option', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--mode', 'free',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.mode).toBe('free');
    });

    it('defaults mode to mock', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--output', 'out.json',
      ]);

      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.mode).toBe('mock');
    });
  });

  describe('validation', () => {
    it('rejects invalid model spec format', async () => {
      await expect(
        runCommand(['gsm8k', '--models', 'invalid-model', '--output', 'out.json']),
      ).rejects.toThrow('Invalid model spec');
    });

    it('rejects invalid provider name', async () => {
      await expect(
        runCommand(['gsm8k', '--models', 'badprovider:model', '--output', 'out.json']),
      ).rejects.toThrow('Invalid provider');
    });

    it('rejects invalid sample count', async () => {
      await expect(
        runCommand([
          'gsm8k',
          '--models', 'openai:gpt-4o',
          '--sample', '-1',
          '--output', 'out.json',
        ]),
      ).rejects.toThrow('Invalid sample count');
    });

    it('rejects non-integer sample count', async () => {
      await expect(
        runCommand([
          'gsm8k',
          '--models', 'openai:gpt-4o',
          '--sample', 'abc',
          '--output', 'out.json',
        ]),
      ).rejects.toThrow('Invalid sample count');
    });

    it('rejects invalid strategy', async () => {
      await expect(
        runCommand([
          'gsm8k',
          '--models', 'openai:gpt-4o',
          '--strategies', 'nonexistent',
          '--output', 'out.json',
        ]),
      ).rejects.toThrow('Invalid strategy');
    });

    it('rejects negative request delay', async () => {
      await expect(
        runCommand([
          'gsm8k',
          '--models', 'openai:gpt-4o',
          '--request-delay-ms', '-5',
          '--output', 'out.json',
        ]),
      ).rejects.toThrow('Invalid request delay');
    });

    it('rejects non-numeric temperature', async () => {
      await expect(
        runCommand([
          'gsm8k',
          '--models', 'openai:gpt-4o',
          '--temperature', 'hot',
          '--output', 'out.json',
        ]),
      ).rejects.toThrow('Invalid temperature');
    });
  });

  describe('runner configuration', () => {
    it('passes evaluator from dataset to runner', async () => {
      const fakeEvaluator = { name: 'numeric' as const, evaluate: vi.fn() };
      mockCreateEvaluatorForDataset.mockReturnValue(fakeEvaluator);

      await runCommand(['gsm8k', '--models', 'openai:gpt-4o', '--output', 'out.json']);

      expect(mockCreateEvaluatorForDataset).toHaveBeenCalledWith('gsm8k', undefined);
      const config = MockBenchmarkRunner.mock.calls[0][0];
      expect(config.evaluator).toBe(fakeEvaluator);
    });

    it('calls registerProviders with model providers', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o', 'anthropic:claude-3',
        '--output', 'out.json',
      ]);

      expect(mockRegisterProviders).toHaveBeenCalledTimes(1);
      const providers = mockRegisterProviders.mock.calls[0][1];
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });

    it('includes summarizer provider in registerProviders call', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--summarizer', 'google:gemini-pro',
        '--output', 'out.json',
      ]);

      const providers = mockRegisterProviders.mock.calls[0][1];
      expect(providers).toContain('google');
    });

    it('passes questions, output path, and output to runner.run', async () => {
      const questions = [{ id: 'q1', prompt: 'Test?', groundTruth: '42' }];
      mockLoadBenchmarkQuestions.mockResolvedValue({
        datasetName: 'gsm8k',
        questions,
      });

      await runCommand(['gsm8k', '--models', 'openai:gpt-4o', '--output', 'result.json']);

      expect(mockRunnerRun).toHaveBeenCalledTimes(1);
      const runArgs = mockRunnerRun.mock.calls[0][0];
      expect(runArgs.questions).toEqual(questions);
      expect(runArgs.outputPath).toBe('result.json');
      expect(runArgs.output).toBeDefined();
    });
  });

  describe('resume behavior', () => {
    it('loads and validates existing output when --resume is used', async () => {
      const existingOutput = makeOutputFile();
      mockFileExists.mockResolvedValue(true);
      mockReadJsonFile.mockResolvedValue(existingOutput);

      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--output', 'out.json',
        '--resume',
      ]);

      expect(mockFileExists).toHaveBeenCalledWith('out.json');
      expect(mockReadJsonFile).toHaveBeenCalledWith('out.json');
      expect(assertValidResumedOutput).toHaveBeenCalled();
    });

    it('skips resume when file does not exist', async () => {
      mockFileExists.mockResolvedValue(false);

      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--output', 'out.json',
        '--resume',
      ]);

      expect(mockReadJsonFile).not.toHaveBeenCalled();
    });

    it('does not attempt resume when --resume flag is not used', async () => {
      await runCommand([
        'gsm8k',
        '--models', 'openai:gpt-4o',
        '--output', 'out.json',
      ]);

      expect(mockFileExists).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('propagates runner errors', async () => {
      mockRunnerRun.mockRejectedValue(new Error('Runner failed'));

      await expect(
        runCommand(['gsm8k', '--models', 'openai:gpt-4o', '--output', 'out.json']),
      ).rejects.toThrow('Runner failed');
    });

    it('propagates dataset loading errors', async () => {
      mockLoadBenchmarkQuestions.mockRejectedValue(new Error('Dataset unavailable'));

      await expect(
        runCommand(['gsm8k', '--models', 'openai:gpt-4o', '--output', 'out.json']),
      ).rejects.toThrow('Dataset unavailable');
    });
  });

  describe('output', () => {
    it('writes completion message to stdout', async () => {
      const writeSpy = vi.spyOn(process.stdout, 'write');
      await runCommand(['gsm8k', '--models', 'openai:gpt-4o', '--output', 'out.json']);

      const calls = writeSpy.mock.calls.map((call) => String(call[0]));
      expect(calls.some((call) => call.includes('Benchmark completed'))).toBe(true);
    });
  });
});
