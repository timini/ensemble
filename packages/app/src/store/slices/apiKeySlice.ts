/**
 * API Key Slice
 *
 * Manages provider API keys with AES-256-GCM encryption (Free Mode only)
 * Keys are encrypted before localStorage persistence
 */

import type { StateCreator } from 'zustand';
import { decrypt, encrypt } from '@ensemble-ai/shared-utils/security';
import type { ValidationStatus } from '@/components/molecules/ApiKeyInput';
import type { ProviderType } from './ensembleSlice';
import { toError } from '~/lib/errors';

export interface ApiKeyData {
  encrypted: string | null;
  key: string;
  visible: boolean;
  status: ValidationStatus;
  error?: string;
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
  hideAllApiKeys: () => void;
  getApiKey: (provider: ProviderType) => string | null;
  clearApiKeys: () => void;
  initializeEncryption: () => Promise<void>;
  setApiKeyStatus: (
    provider: ProviderType,
    status: ValidationStatus,
    error?: string,
  ) => void;
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
          set((state) => {
            const currentEntry = state.apiKeys[provider];
            const nextEntry = currentEntry
              ? {
                  ...currentEntry,
                  key: decrypted,
                  status: currentEntry.status ?? 'idle',
                }
              : {
                  key: decrypted,
                  encrypted: null,
                  visible: false,
                  status: 'idle',
                };

            return {
              apiKeys: {
                ...state.apiKeys,
                [provider]: nextEntry,
              },
            };
          });
        } catch (error: unknown) {
          const normalizedError = toError(
            error,
            `Failed to decrypt ${provider} API key`,
          );
          console.error(`Failed to decrypt ${provider} API key`, normalizedError);
          set((state) => {
            const currentEntry = state.apiKeys[provider];
            return {
              apiKeys: {
                ...state.apiKeys,
                [provider]: currentEntry
                  ? {
                      ...currentEntry,
                      key: '',
                      encrypted: null,
                      status: 'idle',
                    }
                  : null,
              },
            };
          });
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
            status: 'idle',
          },
        },
      }));
    } catch (error: unknown) {
      const normalizedError = toError(
        error,
        `Failed to encrypt ${provider} API key`,
      );
      console.error(`Failed to encrypt ${provider} API key`, normalizedError);
      throw normalizedError;
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

  hideAllApiKeys: () => {
    set((state) => {
      const providers: ProviderType[] = ['openai', 'anthropic', 'google', 'xai'];
      const updatedKeys = { ...state.apiKeys };
      for (const provider of providers) {
        const entry = updatedKeys[provider];
        if (entry?.visible) {
          updatedKeys[provider] = { ...entry, visible: false };
        }
      }
      return { apiKeys: updatedKeys };
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

  setApiKeyStatus: (provider, status, error) => {
    set((state) => {
      const current = state.apiKeys[provider];
      if (!current) {
        return state;
      }

      return {
        apiKeys: {
          ...state.apiKeys,
          [provider]: {
            ...current,
            status,
            error,
          },
        },
      };
    });
  },
});
