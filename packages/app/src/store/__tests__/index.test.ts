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
});
