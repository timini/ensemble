import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createBaselineCommand } from './baseline.js';

vi.mock('../lib/benchmarkDatasets.js', () => ({
  loadBenchmarkQuestions: vi.fn(),
}));

vi.mock('../lib/evaluators.js', () => ({
  createEvaluatorForDataset: vi.fn(),
}));

vi.mock('../lib/io.js', () => ({
  writeJsonFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/providers.js', () => ({
  registerProviders: vi.fn(),
}));

vi.mock('../lib/evaluation.js', () => ({
  evaluateResponses: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/selfConsistency.js', () => ({
  buildSelfConsistencyResult: vi.fn().mockReturnValue(undefined),
}));

vi.mock('../lib/ensembleRunner.js', () => {
  const EnsembleRunner = vi.fn();
  EnsembleRunner.prototype.runPrompt = vi.fn();
  return { EnsembleRunner };
});

import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { createEvaluatorForDataset } from '../lib/evaluators.js';
import { writeJsonFile } from '../lib/io.js';
import { registerProviders } from '../lib/providers.js';
import { EnsembleRunner } from '../lib/ensembleRunner.js';
import { evaluateResponses } from '../lib/evaluation.js';
import { buildSelfConsistencyResult } from '../lib/selfConsistency.js';
import type { ProviderResponse } from '../types.js';

const mockLoadBenchmarkQuestions = vi.mocked(loadBenchmarkQuestions);
const mockCreateEvaluatorForDataset = vi.mocked(createEvaluatorForDataset);
const mockWriteJsonFile = vi.mocked(writeJsonFile);
const mockRegisterProviders = vi.mocked(registerProviders);
const MockEnsembleRunner = vi.mocked(EnsembleRunner);
const mockEvaluateResponses = vi.mocked(evaluateResponses);
const mockBuildSelfConsistencyResult = vi.mocked(buildSelfConsistencyResult);
const mockRunPrompt = EnsembleRunner.prototype.runPrompt as unknown as ReturnType<typeof vi.fn>;

function makeResponse(overrides?: Partial<ProviderResponse>): ProviderResponse {
  return {
    provider: 'openai',
    model: 'gpt-4o',
    content: 'answer: 42',
    responseTimeMs: 100,
    tokenCount: 50,
    ...overrides,
  };
}

function setupDefaults(): void {
  mockLoadBenchmarkQuestions.mockResolvedValue({
    datasetName: 'gsm8k',
    questions: [{ id: 'gsm8k-0', prompt: 'What is 1+1?', groundTruth: '2' }],
  });
  mockCreateEvaluatorForDataset.mockReturnValue(null);
  mockRunPrompt.mockResolvedValue([makeResponse()]);
}

async function runCommand(args: string[]): Promise<void> {
  const command = createBaselineCommand();
  command.exitOverride();
  await command.parseAsync(['node', 'baseline', ...args]);
}

describe('baseline command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setupDefaults();
  });

  describe('argument parsing', () => {
    it('parses required --model and dataset argument', async () => {
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o']);

      expect(mockLoadBenchmarkQuestions).toHaveBeenCalledWith('gsm8k', { sample: 10 });
      expect(MockEnsembleRunner).toHaveBeenCalledTimes(1);
    });

    it('parses --samples option', async () => {
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o', '--samples', '5']);

      expect(mockLoadBenchmarkQuestions).toHaveBeenCalledWith('gsm8k', { sample: 5 });
    });

    it('defaults samples to 10', async () => {
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o']);

      expect(mockLoadBenchmarkQuestions).toHaveBeenCalledWith('gsm8k', { sample: 10 });
    });

    it('parses --output option', async () => {
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o', '--output', 'custom.json']);

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      expect(mockWriteJsonFile.mock.calls[0][0]).toBe('custom.json');
    });

    it('defaults output to eval-baseline-results.json', async () => {
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o']);

      expect(mockWriteJsonFile.mock.calls[0][0]).toBe('eval-baseline-results.json');
    });

    it('parses --self-consistency-runs option', async () => {
      await runCommand([
        'gsm8k',
        '--model', 'openai:gpt-4o',
        '--self-consistency-runs', '3',
      ]);

      const runPromptCall = mockRunPrompt.mock.calls[0];
      expect(runPromptCall[1]).toHaveLength(3);
      expect(
        runPromptCall[1].every(
          (m: { provider: string; model: string }) => m.model === 'gpt-4o',
        ),
      ).toBe(true);
    });

    it('defaults self-consistency runs to 1', async () => {
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o']);

      const runPromptCall = mockRunPrompt.mock.calls[0];
      expect(runPromptCall[1]).toHaveLength(1);
    });

    it('parses --request-delay-ms option', async () => {
      await runCommand([
        'gsm8k',
        '--model', 'openai:gpt-4o',
        '--request-delay-ms', '100',
      ]);

      const constructorArgs = MockEnsembleRunner.mock.calls[0];
      expect(constructorArgs[2]).toMatchObject({ requestDelayMs: 100 });
    });

    it('parses --temperature option', async () => {
      await runCommand([
        'gsm8k',
        '--model', 'openai:gpt-4o',
        '--temperature', '0.5',
      ]);

      const constructorArgs = MockEnsembleRunner.mock.calls[0];
      expect(constructorArgs[2]).toMatchObject({ temperature: 0.5 });
    });

    it('parses --mode option', async () => {
      await runCommand([
        'gsm8k',
        '--model', 'openai:gpt-4o',
        '--mode', 'free',
      ]);

      const constructorArgs = MockEnsembleRunner.mock.calls[0];
      expect(constructorArgs[1]).toBe('free');
    });
  });

  describe('validation', () => {
    it('rejects invalid model spec', async () => {
      await expect(
        runCommand(['gsm8k', '--model', 'no-colon']),
      ).rejects.toThrow('Invalid model spec');
    });

    it('rejects invalid sample count', async () => {
      await expect(
        runCommand(['gsm8k', '--model', 'openai:gpt-4o', '--samples', '0']),
      ).rejects.toThrow('Invalid sample count');
    });

    it('rejects invalid self-consistency run count', async () => {
      await expect(
        runCommand([
          'gsm8k',
          '--model', 'openai:gpt-4o',
          '--self-consistency-runs', '0',
        ]),
      ).rejects.toThrow('Invalid self-consistency run count');
    });

    it('rejects negative request delay', async () => {
      await expect(
        runCommand([
          'gsm8k',
          '--model', 'openai:gpt-4o',
          '--request-delay-ms', '-10',
        ]),
      ).rejects.toThrow('Invalid request delay');
    });

    it('rejects non-numeric temperature', async () => {
      await expect(
        runCommand([
          'gsm8k',
          '--model', 'openai:gpt-4o',
          '--temperature', 'warm',
        ]),
      ).rejects.toThrow('Invalid temperature');
    });
  });

  describe('execution flow', () => {
    it('registers providers for the specified model', async () => {
      await runCommand(['gsm8k', '--model', 'anthropic:claude-3']);

      expect(mockRegisterProviders).toHaveBeenCalledTimes(1);
      const providers = mockRegisterProviders.mock.calls[0][1];
      expect(providers).toEqual(['anthropic']);
    });

    it('creates evaluator from dataset', async () => {
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o']);

      expect(mockCreateEvaluatorForDataset).toHaveBeenCalledWith('gsm8k', undefined);
    });

    it('calls evaluateResponses for each question', async () => {
      mockLoadBenchmarkQuestions.mockResolvedValue({
        datasetName: 'gsm8k',
        questions: [
          { id: 'q0', prompt: 'Q1', groundTruth: '1' },
          { id: 'q1', prompt: 'Q2', groundTruth: '2' },
        ],
      });

      await runCommand(['gsm8k', '--model', 'openai:gpt-4o']);

      expect(mockEvaluateResponses).toHaveBeenCalledTimes(2);
    });

    it('calls buildSelfConsistencyResult when runs > 1', async () => {
      await runCommand([
        'gsm8k',
        '--model', 'openai:gpt-4o',
        '--self-consistency-runs', '3',
      ]);

      expect(mockBuildSelfConsistencyResult).toHaveBeenCalledWith(
        expect.objectContaining({ runCount: 3 }),
      );
    });

    it('writes output file with correct structure', async () => {
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o']);

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      const output = mockWriteJsonFile.mock.calls[0][1] as Record<string, unknown>;
      expect(output.type).toBe('baseline');
      expect(output.dataset).toBe('gsm8k');
      expect(output.model).toBe('openai:gpt-4o');
      expect(Array.isArray(output.runs)).toBe(true);
    });
  });

  describe('output', () => {
    it('writes completion message to stdout', async () => {
      const writeSpy = vi.spyOn(process.stdout, 'write');
      await runCommand(['gsm8k', '--model', 'openai:gpt-4o']);

      const calls = writeSpy.mock.calls.map((call) => String(call[0]));
      expect(calls.some((call) => call.includes('Baseline completed'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('propagates dataset loading errors', async () => {
      mockLoadBenchmarkQuestions.mockRejectedValue(new Error('Dataset unavailable'));

      await expect(
        runCommand(['gsm8k', '--model', 'openai:gpt-4o']),
      ).rejects.toThrow('Dataset unavailable');
    });

    it('propagates ensemble runner errors', async () => {
      mockRunPrompt.mockRejectedValue(
        new Error('Model call failed'),
      );

      await expect(
        runCommand(['gsm8k', '--model', 'openai:gpt-4o']),
      ).rejects.toThrow('Model call failed');
    });
  });
});
