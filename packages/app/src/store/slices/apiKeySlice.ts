/**
 * API Key Slice
 *
 * Manages provider API keys with AES-256-GCM encryption (Free Mode only)
 * Keys are encrypted before localStorage persistence
 */

import type { StateCreator } from 'zustand';
import { decrypt, encrypt } from '~/lib/encryption';
import type { ProviderType } from './ensembleSlice';

export interface ApiKeyData {
  encrypted: string | null;
  key: string;
  visible: boolean;
}

export interface ApiKeySlice {
  apiKeys: {
    openai: ApiKeyData | null;
    anthropic: ApiKeyData | null;
    google: ApiKeyData | null;
    xai: ApiKeyData | null;
  };
  encryptionInitialized: boolean;

  setApiKey: (provider: ProviderType, key: string) => Promise<void>;
  toggleApiKeyVisibility: (provider: ProviderType) => void;
  getApiKey: (provider: ProviderType) => string | null;
  clearApiKeys: () => void;
  initializeEncryption: () => Promise<void>;
}

export const createApiKeySlice: StateCreator<ApiKeySlice> = (set, get) => ({
  apiKeys: {
    openai: null,
    anthropic: null,
    google: null,
    xai: null,
  },
  encryptionInitialized: false,

  initializeEncryption: async () => {
    const { encryptionInitialized } = get();
    if (encryptionInitialized) {
      return;
    }

    const providers: ProviderType[] = ['openai', 'anthropic', 'google', 'xai'];

    await Promise.all(
      providers.map(async (provider) => {
        const entry = get().apiKeys[provider];
        if (!entry?.encrypted) {
          return;
        }

        try {
          const decrypted = await decrypt(entry.encrypted);
          set((state) => ({
            apiKeys: {
              ...state.apiKeys,
              [provider]: {
                ...state.apiKeys[provider]!,
                key: decrypted,
              },
            },
          }));
        } catch (error) {
          console.error(`Failed to decrypt ${provider} API key`, error);
          set((state) => ({
            apiKeys: {
              ...state.apiKeys,
              [provider]: state.apiKeys[provider]
                ? {
                    ...state.apiKeys[provider]!,
                    key: '',
                    encrypted: null,
                  }
                : null,
            },
          }));
        }
      }),
    );

    set({ encryptionInitialized: true });
  },

  setApiKey: async (provider, key) => {
    const trimmedKey = key.trim();
    if (trimmedKey.length === 0) {
      set((state) => ({
        apiKeys: {
          ...state.apiKeys,
          [provider]: null,
        },
      }));
      return;
    }

    const previousVisibility = get().apiKeys[provider]?.visible ?? false;

    try {
      const encrypted = await encrypt(trimmedKey);
      set((state) => ({
        apiKeys: {
          ...state.apiKeys,
          [provider]: {
            key: trimmedKey,
            encrypted,
            visible: previousVisibility,
          },
        },
      }));
    } catch (error) {
      console.error(`Failed to encrypt ${provider} API key`, error);
      throw error;
    }
  },

  toggleApiKeyVisibility: (provider) => {
    set((state) => {
      const currentKey = state.apiKeys[provider];
      if (!currentKey) return state;

      return {
        apiKeys: {
          ...state.apiKeys,
          [provider]: {
            ...currentKey,
            visible: !currentKey.visible,
          },
        },
      };
    });
  },

  getApiKey: (provider) => {
    const state = get();
    return state.apiKeys[provider]?.key ?? null;
  },

  clearApiKeys: () => {
    set({
      apiKeys: {
        openai: null,
        anthropic: null,
        google: null,
        xai: null,
      },
      encryptionInitialized: false,
    });
  },
});
