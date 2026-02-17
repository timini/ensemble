import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRunCommand } from './run.js';

vi.mock('@ensemble-ai/shared-utils/providers', () => {
  const ProviderRegistry = vi.fn();
  ProviderRegistry.prototype.getProvider = vi.fn().mockReturnValue({
    streamResponse: vi.fn(),
    generateEmbeddings: vi.fn(),
    validateApiKey: vi.fn(),
    listAvailableModels: vi.fn().mockReturnValue([]),
    listAvailableTextModels: vi.fn(),
  });
  return { ProviderRegistry };
});

vi.mock('../lib/io.js', () => ({
  writeJsonFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/providers.js', () => ({
  registerProviders: vi.fn(),
}));

vi.mock('../lib/consensus.js', () => ({
  parseStrategies: vi.fn((values: string[]) => values),
  generateConsensus: vi.fn().mockResolvedValue({ outputs: {}, metrics: {} }),
}));

vi.mock('../lib/ensembleRunner.js', () => {
  const EnsembleRunner = vi.fn();
  EnsembleRunner.prototype.runPrompt = vi.fn();
  return { EnsembleRunner };
});

import { writeJsonFile } from '../lib/io.js';
import { registerProviders } from '../lib/providers.js';
import { generateConsensus } from '../lib/consensus.js';
import { EnsembleRunner } from '../lib/ensembleRunner.js';
import type { ProviderResponse } from '../types.js';

const mockWriteJsonFile = vi.mocked(writeJsonFile);
const mockRegisterProviders = vi.mocked(registerProviders);
const mockGenerateConsensus = vi.mocked(generateConsensus);
const MockEnsembleRunner = vi.mocked(EnsembleRunner);
const mockRunPrompt = EnsembleRunner.prototype.runPrompt as unknown as ReturnType<typeof vi.fn>;

function makeResponse(overrides?: Partial<ProviderResponse>): ProviderResponse {
  return {
    provider: 'openai',
    model: 'gpt-4o',
    content: 'Response text',
    responseTimeMs: 120,
    tokenCount: 80,
    ...overrides,
  };
}

function setupDefaults(): void {
  mockRunPrompt.mockResolvedValue([makeResponse()]);
  mockGenerateConsensus.mockResolvedValue({ outputs: { standard: 'Consensus text' }, metrics: { standard: { tokenCount: 100, durationMs: 500 } } });
}

async function runCommand(args: string[]): Promise<void> {
  const command = createRunCommand();
  command.exitOverride();
  await command.parseAsync(['node', 'run', ...args]);
}

describe('run command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setupDefaults();
  });

  describe('argument parsing', () => {
    it('parses prompt argument and --models option', async () => {
      await runCommand(['What is AI?', '--models', 'openai:gpt-4o']);

      expect(MockEnsembleRunner.prototype.runPrompt).toHaveBeenCalledWith(
        'What is AI?',
        [{ provider: 'openai', model: 'gpt-4o' }],
      );
    });

    it('parses multiple models', async () => {
      await runCommand([
        'Test prompt',
        '--models', 'openai:gpt-4o,anthropic:claude-3',
      ]);

      const models = mockRunPrompt.mock.calls[0][1];
      expect(models).toEqual([
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'anthropic', model: 'claude-3' },
      ]);
    });

    it('parses --strategy option', async () => {
      await runCommand([
        'Test prompt',
        '--models', 'openai:gpt-4o',
        '--strategy', 'elo',
      ]);

      expect(mockGenerateConsensus).toHaveBeenCalledTimes(1);
    });

    it('parses --summarizer option', async () => {
      await runCommand([
        'Test prompt',
        '--models', 'openai:gpt-4o',
        '--summarizer', 'google:gemini-pro',
      ]);

      const providers = mockRegisterProviders.mock.calls[0][1];
      expect(providers).toContain('google');
    });

    it('parses --request-delay-ms option', async () => {
      await runCommand([
        'Test prompt',
        '--models', 'openai:gpt-4o',
        '--request-delay-ms', '50',
      ]);

      const constructorArgs = MockEnsembleRunner.mock.calls[0];
      expect(constructorArgs[2]).toMatchObject({ requestDelayMs: 50 });
    });

    it('parses --mode option', async () => {
      await runCommand([
        'Test prompt',
        '--models', 'openai:gpt-4o',
        '--mode', 'free',
      ]);

      const constructorArgs = MockEnsembleRunner.mock.calls[0];
      expect(constructorArgs[1]).toBe('free');
    });
  });

  describe('validation', () => {
    it('rejects invalid model spec', async () => {
      await expect(
        runCommand(['Test prompt', '--models', 'bad-model']),
      ).rejects.toThrow('Invalid model spec');
    });

    it('rejects negative request delay', async () => {
      await expect(
        runCommand([
          'Test prompt',
          '--models', 'openai:gpt-4o',
          '--request-delay-ms', '-1',
        ]),
      ).rejects.toThrow('Invalid request delay');
    });
  });

  describe('output formatting', () => {
    it('writes JSON to stdout when --output is not provided', async () => {
      const writeSpy = vi.spyOn(process.stdout, 'write');
      await runCommand(['Test prompt', '--models', 'openai:gpt-4o']);

      const calls = writeSpy.mock.calls.map((call) => String(call[0]));
      const jsonOutput = calls.find((call) => call.includes('"prompt"'));
      expect(jsonOutput).toBeDefined();
      const parsed = JSON.parse(jsonOutput!) as Record<string, unknown>;
      expect(parsed.prompt).toBe('Test prompt');
      expect(parsed.responses).toBeDefined();
      expect(parsed.consensus).toBeDefined();
    });

    it('writes to file when --output is provided', async () => {
      await runCommand([
        'Test prompt',
        '--models', 'openai:gpt-4o',
        '--output', 'result.json',
      ]);

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      expect(mockWriteJsonFile.mock.calls[0][0]).toBe('result.json');
      const written = mockWriteJsonFile.mock.calls[0][1] as Record<string, unknown>;
      expect(written.prompt).toBe('Test prompt');
    });

    it('writes completion message when output file is used', async () => {
      const writeSpy = vi.spyOn(process.stdout, 'write');
      await runCommand([
        'Test prompt',
        '--models', 'openai:gpt-4o',
        '--output', 'result.json',
      ]);

      const calls = writeSpy.mock.calls.map((call) => String(call[0]));
      expect(calls.some((call) => call.includes('Run completed'))).toBe(true);
    });
  });

  describe('consensus generation', () => {
    it('uses first successful response as summarizer when none specified', async () => {
      mockRunPrompt.mockResolvedValue([
        makeResponse({ error: 'failed', provider: 'anthropic', model: 'claude' }),
        makeResponse({ provider: 'openai', model: 'gpt-4o' }),
      ]);

      await runCommand(['Test prompt', '--models', 'anthropic:claude', 'openai:gpt-4o']);

      expect(mockGenerateConsensus).toHaveBeenCalledTimes(1);
    });

    it('skips consensus when all responses fail', async () => {
      mockRunPrompt.mockResolvedValue([
        makeResponse({ error: 'failed' }),
      ]);

      await runCommand(['Test prompt', '--models', 'openai:gpt-4o']);

      expect(mockGenerateConsensus).not.toHaveBeenCalled();
    });
  });

  describe('provider registration', () => {
    it('registers providers for all models', async () => {
      await runCommand([
        'Test prompt',
        '--models', 'openai:gpt-4o', 'anthropic:claude-3',
      ]);

      expect(mockRegisterProviders).toHaveBeenCalledTimes(1);
      const providers = mockRegisterProviders.mock.calls[0][1];
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });
  });

  describe('error handling', () => {
    it('propagates runner errors', async () => {
      mockRunPrompt.mockRejectedValue(
        new Error('API timeout'),
      );

      await expect(
        runCommand(['Test prompt', '--models', 'openai:gpt-4o']),
      ).rejects.toThrow('API timeout');
    });
  });
});
