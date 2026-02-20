import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createApiKeySlice, type ApiKeySlice } from '../slices/apiKeySlice';

vi.mock('@ensemble-ai/shared-utils/security', () => ({
  encrypt: vi.fn().mockImplementation(async (value: string) => `enc:${value}`),
  decrypt: vi.fn().mockImplementation(async (value: string) =>
    value.replace(/^enc:/, ''),
  ),
}));

import { encrypt, decrypt } from '@ensemble-ai/shared-utils/security';

const encryptMock = vi.mocked(encrypt);
const decryptMock = vi.mocked(decrypt);

describe('apiKeySlice', () => {
  let store: StoreApi<ApiKeySlice>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore<ApiKeySlice>()(createApiKeySlice);
  });

  it('clears provider state when API key is empty', async () => {
    await store.getState().setApiKey('openai', '');
    expect(store.getState().apiKeys.openai).toBeNull();
  });

  it('persists trimmed API keys via encrypt', async () => {
    await store.getState().setApiKey('openai', '  sk-test  ');

    expect(encryptMock).toHaveBeenCalledWith('sk-test');
    expect(store.getState().apiKeys.openai).toMatchObject({
      key: 'sk-test',
      encrypted: 'enc:sk-test',
      visible: false,
      status: 'idle',
    });
  });

  it('preserves visibility toggles when updating API keys', async () => {
    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: 'existing',
          encrypted: 'enc:existing',
          visible: true,
          status: 'valid',
        },
      },
    });

    await store.getState().setApiKey('openai', 'next');
    expect(store.getState().apiKeys.openai?.visible).toBe(true);
  });

  it('propagates encryption errors', async () => {
    encryptMock.mockRejectedValueOnce(new Error('boom'));

    await expect(store.getState().setApiKey('openai', 'sk')).rejects.toThrow(
      'boom',
    );
  });

  it('toggles visibility only when an entry exists', async () => {
    await store.getState().setApiKey('openai', 'sk-key');
    store.getState().toggleApiKeyVisibility('openai');
    expect(store.getState().apiKeys.openai?.visible).toBe(true);

    store.getState().toggleApiKeyVisibility('anthropic');
    expect(store.getState().apiKeys.anthropic).toBeNull();
  });

  it('clears API keys and resets encryption state', () => {
    store.setState({
      apiKeys: {
        openai: {
          key: 'foo',
          encrypted: 'enc:foo',
          visible: false,
          status: 'idle',
        },
        anthropic: null,
        google: null,
        xai: null,
        deepseek: null,
      },
      encryptionInitialized: true,
    });

    store.getState().clearApiKeys();
    expect(store.getState().apiKeys.openai).toBeNull();
    expect(store.getState().encryptionInitialized).toBe(false);
  });

  it('updates API key status only when entry exists', () => {
    store.getState().setApiKeyStatus('openai', 'valid');
    expect(store.getState().apiKeys.openai).toBeNull();

    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: 'foo',
          encrypted: 'enc:foo',
          visible: false,
          status: 'idle',
        },
      },
    });
    store.getState().setApiKeyStatus('openai', 'valid');
    expect(store.getState().apiKeys.openai?.status).toBe('valid');
  });

  it('initializes encryption at most once and decrypts entries', async () => {
    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: '',
          encrypted: 'enc:sk-test',
          visible: false,
          status: 'idle',
        },
      },
    });

    await store.getState().initializeEncryption();
    expect(decryptMock).toHaveBeenCalledWith('enc:sk-test');
    expect(store.getState().apiKeys.openai?.key).toBe('sk-test');
    expect(store.getState().encryptionInitialized).toBe(true);

    await store.getState().initializeEncryption();
    expect(decryptMock).toHaveBeenCalledTimes(1);
  });

  it('hides all visible API keys', async () => {
    await store.getState().setApiKey('openai', 'sk-key1');
    await store.getState().setApiKey('anthropic', 'sk-key2');
    store.getState().toggleApiKeyVisibility('openai');
    store.getState().toggleApiKeyVisibility('anthropic');
    expect(store.getState().apiKeys.openai?.visible).toBe(true);
    expect(store.getState().apiKeys.anthropic?.visible).toBe(true);

    store.getState().hideAllApiKeys();
    expect(store.getState().apiKeys.openai?.visible).toBe(false);
    expect(store.getState().apiKeys.anthropic?.visible).toBe(false);
  });

  it('hideAllApiKeys is a no-op when no keys are visible', () => {
    store.getState().hideAllApiKeys();
    expect(store.getState().apiKeys.openai).toBeNull();
  });

  it('handles decryption failures by clearing encrypted values', async () => {
    decryptMock.mockRejectedValueOnce(new Error('bad decrypt'));
    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: '',
          encrypted: 'enc:sk-test',
          visible: false,
          status: 'valid',
        },
      },
    });

    await store.getState().initializeEncryption();
    expect(store.getState().apiKeys.openai?.key).toBe('');
    expect(store.getState().apiKeys.openai?.encrypted).toBeNull();
  });
});
