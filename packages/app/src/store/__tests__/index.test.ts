import { describe, expect, it } from 'vitest';
import type { StoreState } from '../index';
import { serializeStoreState } from '../index';

function createStateWithApiKey(): StoreState {
  return {
    apiKeys: {
      openai: {
        key: 'sk-secret-key',
        encrypted: 'iv:ciphertext',
        visible: true,
        status: 'valid',
      },
      anthropic: null,
      google: null,
      xai: null,
      deepseek: null,
      perplexity: null,
    },
    encryptionInitialized: true,
  } as unknown as StoreState;
}

describe('serializeStoreState', () => {
  it('removes plaintext API keys while preserving encrypted payloads', () => {
    const input = createStateWithApiKey();

    const serialized = serializeStoreState(input);

    expect(serialized.apiKeys.openai?.key).toBe('');
    expect(serialized.apiKeys.openai?.encrypted).toBe('iv:ciphertext');
    expect(serialized.apiKeys.openai?.visible).toBe(false);
    expect(serialized.encryptionInitialized).toBe(false);
  });

  it('stores a key still being validated as idle, so the next load checks it again', () => {
    const input = createStateWithApiKey();
    input.apiKeys.openai = { ...input.apiKeys.openai!, status: 'validating' };

    const serialized = serializeStoreState(input);

    expect(serialized.apiKeys.openai?.status).toBe('idle');
  });
});

describe('store hydration', () => {
  it('keeps the last run and marks streams cut off by a reload as interrupted', async () => {
    const { vi } = await import('vitest');
    // An in-memory Storage, so the test does not depend on how the Node
    // version exposes localStorage under jsdom.
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
    vi.stubGlobal('localStorage', storage);
    storage.setItem(
      'ensemble-ai-store',
      JSON.stringify({
        prompt: 'Saved prompt',
        metaAnalysis: 'Saved consensus',
        responses: [
          {
            modelId: 'a',
            provider: 'openai',
            model: 'A',
            response: 'Half',
            isStreaming: true,
            isComplete: false,
            responseTime: null,
            tokenCount: null,
            error: null,
          },
        ],
      }),
    );
    vi.resetModules();
    const { useStore } = await import('../index');

    const state = useStore.getState();
    expect(state.prompt).toBe('Saved prompt');
    expect(state.metaAnalysis).toBe('Saved consensus');
    expect(state.responses[0]).toMatchObject({
      isStreaming: false,
      errorKind: 'interrupted',
    });
    vi.unstubAllGlobals();
  });
});

describe('serializeStoreState endpoints', () => {
  it('removes plaintext endpoint keys while keeping the encrypted form', () => {
    const input = {
      apiKeys: { openai: null, anthropic: null, google: null, xai: null, deepseek: null, perplexity: null },
      endpoints: [
        {
          id: 'openrouter',
          presetId: 'openrouter',
          label: 'OpenRouter',
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: 'sk-or-secret',
          encryptedApiKey: 'iv:cipher',
          embeddingModel: '',
          status: 'valid',
        },
      ],
    } as unknown as StoreState;

    const serialized = serializeStoreState(input);
    expect(serialized.endpoints[0]).toMatchObject({ apiKey: '', encryptedApiKey: 'iv:cipher', status: 'valid' });
    expect(JSON.stringify(serialized)).not.toContain('sk-or-secret');
  });
});
