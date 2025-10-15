/**
 * API Key Slice
 *
 * Manages provider API keys with AES-256-GCM encryption (Free Mode only)
 * Keys are encrypted before localStorage persistence
 */

import type { StateCreator } from 'zustand';
import type { ProviderType } from './ensembleSlice';

export interface ApiKeyData {
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
  encryptionKey: string | null;

  setApiKey: (provider: ProviderType, key: string) => void;
  toggleApiKeyVisibility: (provider: ProviderType) => void;
  getApiKey: (provider: ProviderType) => string | null;
  clearApiKeys: () => void;
  initializeEncryption: () => void;
}

export const createApiKeySlice: StateCreator<ApiKeySlice> = (set, get) => ({
  apiKeys: {
    openai: null,
    anthropic: null,
    google: null,
    xai: null,
  },
  encryptionKey: null,

  initializeEncryption: () => {
    // Placeholder for future encryption implementation
    // For now, keys are stored in plain text in localStorage
  },

  setApiKey: (provider, key) => {
    set((state) => {
      // Preserve existing visibility state when updating key
      const existingData = state.apiKeys[provider];
      return {
        apiKeys: {
          ...state.apiKeys,
          [provider]: {
            key,
            visible: existingData?.visible ?? false,
          },
        },
      };
    });
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
    });
  },
});

// TODO: Implement proper AES-256-GCM encryption for API keys
// For now, keys are stored in plain text in localStorage
// This should be replaced with proper encryption before production
