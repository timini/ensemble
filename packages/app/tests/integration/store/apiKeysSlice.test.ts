import { beforeEach, describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { persist } from '~/store/middleware/persistenceMiddleware';
import {
  createThemeSlice,
  type ThemeSlice,
} from '~/store/slices/themeSlice';
import {
  createLanguageSlice,
  type LanguageSlice,
} from '~/store/slices/languageSlice';
import {
  createWorkflowSlice,
  type WorkflowSlice,
} from '~/store/slices/workflowSlice';
import {
  createModeSlice,
  type ModeSlice,
} from '~/store/slices/modeSlice';
import {
  createApiKeySlice,
  type ApiKeySlice,
} from '~/store/slices/apiKeySlice';
import {
  createEnsembleSlice,
  type EnsembleSlice,
} from '~/store/slices/ensembleSlice';
import {
  createResponseSlice,
  type ResponseSlice,
} from '~/store/slices/responseSlice';
import type { StoreState } from '~/store';
import { serializeStoreState } from '~/store';

type TestStore = ThemeSlice &
  LanguageSlice &
  WorkflowSlice &
  ModeSlice &
  ApiKeySlice &
  EnsembleSlice &
  ResponseSlice;

const STORE_NAME = 'test-ensemble-store';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      const keys = Array.from(map.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function createTestStore(storage: Storage) {
  return create<TestStore>()(
    persist(
      (...a) => ({
        ...createThemeSlice(...a),
        ...createLanguageSlice(...a),
        ...createWorkflowSlice(...a),
        ...createModeSlice(...a),
        ...createApiKeySlice(...a),
        ...createEnsembleSlice(...a),
        ...createResponseSlice(...a),
      }),
      {
        name: STORE_NAME,
        storage,
        serialize: serializeStoreState as (state: StoreState) => StoreState,
      },
    ),
  );
}

describe('API key slice persistence', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('persists encrypted API keys without plaintext', async () => {
    const store = createTestStore(storage);

    await store.getState().setApiKey('openai', 'sk-secret-value');

    const persisted = storage.getItem(STORE_NAME);
    expect(persisted).not.toBeNull();
    expect(persisted).not.toContain('sk-secret-value');

    const parsed = JSON.parse(persisted!);
    expect(parsed.apiKeys.openai.encrypted).toBeTypeOf('string');
    expect(parsed.apiKeys.openai.key).toBe('');
  });

  it('rehydrates encrypted keys and decrypts to plaintext', async () => {
    const store = createTestStore(storage);

    await store.getState().setApiKey('openai', 'sk-secret-value');

    const persisted = storage.getItem(STORE_NAME);
    expect(persisted).not.toBeNull();
    const encryptedValue = JSON.parse(persisted!).apiKeys.openai.encrypted;

    const hydratedStore = createTestStore(storage);

    await hydratedStore.getState().initializeEncryption();

    const hydratedKey = hydratedStore.getState().apiKeys.openai?.key;
    expect(hydratedKey).toBe('sk-secret-value');
    expect(hydratedStore.getState().apiKeys.openai?.encrypted).toBe(
      encryptedValue,
    );
  });

  it('updates status and error message', async () => {
    const store = createTestStore(storage);
    await store.getState().setApiKey('openai', 'sk-test');

    store
      .getState()
      .setApiKeyStatus('openai', 'invalid', 'Rate limit exceeded');

    const entry = store.getState().apiKeys.openai;
    expect(entry?.status).toBe('invalid');
    expect(entry?.error).toBe('Rate limit exceeded');
  });
});
