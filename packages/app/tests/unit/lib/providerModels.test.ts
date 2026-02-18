import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ProviderRegistry,
  type AIProvider,
  type ModelMetadata,
} from '@ensemble-ai/shared-utils/providers';

vi.mock('~/providers', () => ({
  initializeProviders: vi.fn(),
}));

import {
  fetchProviderModels,
  sanitizeModelIdentifier,
  formatModelLabelFromId,
} from '~/lib/providerModels';
import { initializeProviders } from '~/providers';

class StubProvider implements AIProvider {
  constructor(
    private readonly metadata: ModelMetadata[],
    private readonly textModels: string[] = [],
  ) {}

  async streamResponse(): Promise<void> {
    // no-op for tests
  }

  async generateEmbeddings(): Promise<number[]> {
    return [0];
  }

  async validateApiKey() {
    return { valid: true };
  }

  listAvailableModels(): ModelMetadata[] {
    return this.metadata;
  }

  async listAvailableTextModels(): Promise<string[]> {
    return this.textModels;
  }

  async generateStructured() {
    return { parsed: {} as never, raw: '{}', responseTimeMs: 0 };
  }
}

const registry = ProviderRegistry.getInstance();

describe('fetchProviderModels', () => {
  beforeEach(() => {
    registry.clearAll();
    vi.mocked(initializeProviders).mockClear();
  });

  it('prefers dynamic text models when available', async () => {
    registry.register(
      'google',
      'free',
      new StubProvider(
        [
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', contextWindow: 1, costPer1kTokens: 0.1 },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', contextWindow: 1, costPer1kTokens: 0.05 },
        ],
        ['models/gemini-1.5-pro', 'models/gemini-1.5-flash'],
      ),
    );

    const models = await fetchProviderModels({ provider: 'google', mode: 'free' });

    expect(models).toEqual([
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        modalities: ['text', 'image'],
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        modalities: ['text', 'image'],
      },
    ]);
    expect(initializeProviders).toHaveBeenCalledTimes(1);
  });

  it('falls back to metadata when no text models are returned', async () => {
    registry.register(
      'openai',
      'free',
      new StubProvider([
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 1, costPer1kTokens: 0.25 },
      ]),
    );

    const models = await fetchProviderModels({ provider: 'openai', mode: 'free' });

    expect(models).toEqual([
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        modalities: ['text', 'image'],
      },
    ]);
    expect(initializeProviders).toHaveBeenCalledTimes(1);
  });
});

describe('model identifier helpers', () => {
  it('sanitizes provider responses into stable ids', () => {
    expect(sanitizeModelIdentifier('models/gemini-1.5-pro')).toBe('gemini-1.5-pro');
    expect(sanitizeModelIdentifier('  gpt-4o-mini  ')).toBe('gpt-4o-mini');
  });

  it('formats readable labels from ids', () => {
    expect(formatModelLabelFromId('gemini-1.5-pro')).toBe('Gemini 1.5 Pro');
    expect(formatModelLabelFromId('claude_3_haiku')).toBe('Claude 3 Haiku');
  });
});
