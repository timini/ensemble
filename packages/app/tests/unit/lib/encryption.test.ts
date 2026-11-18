import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, deriveKey } from '@ensemble-ai/shared-utils/security';

describe('encryption utilities', () => {
  const plaintext = 'sensitive-api-key';

  it('encrypts and decrypts text with AES-GCM', async () => {
    const ciphertext = await encrypt(plaintext);
    expect(ciphertext).toBeTypeOf('string');
    expect(ciphertext.length).toBeGreaterThan(0);

    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('produces unique ciphertext per invocation via random IV', async () => {
    const first = await encrypt(plaintext);
    const second = await encrypt(plaintext);

    expect(first).not.toBe(second);
  });

  it('throws a descriptive error when Web Crypto API is unavailable', async () => {
    const originalCrypto = globalThis.crypto;

    try {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: undefined,
      });

      await expect(encrypt(plaintext)).rejects.toThrowError(
        /Web Crypto API is not available/i,
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it('derives a consistent AES-GCM key across invocations', async () => {
    const keyA = await deriveKey();
    const keyB = await deriveKey();

    expect(keyA.algorithm.name).toBe('AES-GCM');
    expect(keyB.algorithm.name).toBe('AES-GCM');

    // The same cached key, and its bytes cannot be read out.
    expect(keyA).toBe(keyB);
    expect(keyA.extractable).toBe(false);
  });
});
