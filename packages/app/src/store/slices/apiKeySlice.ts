/**
 * API Key Slice
 *
 * Manages provider API keys with AES-256-GCM encryption (Free Mode only)
 * Keys are encrypted before localStorage persistence
 */

import type { StateCreator } from 'zustand';
import type { ProviderType } from './ensembleSlice';

export interface ApiKeySlice {
  apiKeys: {
    openai: string | null;
    anthropic: string | null;
    google: string | null;
    xai: string | null;
  };
  encryptionKey: string | null;

  setApiKey: (provider: ProviderType, key: string) => Promise<void>;
  getApiKey: (provider: ProviderType) => Promise<string | null>;
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
  encryptionKey: null,

  initializeEncryption: async () => {
    // Generate device-specific encryption key
    if (typeof window === 'undefined') return;

    try {
      const key = await generateEncryptionKey();
      set({ encryptionKey: key });
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
    }
  },

  setApiKey: async (provider, key) => {
    const state = get();
    if (!state.encryptionKey) {
      await state.initializeEncryption();
    }

    try {
      const encryptedKey = await encryptApiKey(key, state.encryptionKey!);
      set((state) => ({
        apiKeys: {
          ...state.apiKeys,
          [provider]: encryptedKey,
        },
      }));
    } catch (error) {
      console.error(`Failed to encrypt API key for ${provider}:`, error);
    }
  },

  getApiKey: async (provider) => {
    const state = get();
    const encryptedKey = state.apiKeys[provider];

    if (!encryptedKey || !state.encryptionKey) {
      return null;
    }

    try {
      return await decryptApiKey(encryptedKey, state.encryptionKey);
    } catch (error) {
      console.error(`Failed to decrypt API key for ${provider}:`, error);
      return null;
    }
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

/**
 * Generate device-specific encryption key using Web Crypto API
 */
async function generateEncryptionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Encrypt API key using AES-256-GCM
 */
async function encryptApiKey(
  apiKey: string,
  encryptionKey: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(encryptionKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(apiKey);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt API key using AES-256-GCM
 */
async function decryptApiKey(
  encryptedApiKey: string,
  encryptionKey: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(encryptionKey),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  const combined = base64ToArrayBuffer(encryptedApiKey);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
