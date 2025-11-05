import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, deriveKey } from '~/lib/encryption';

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

    // CryptoKey equality is not directly comparable; instead validate exported material.
    const exportedA = new Uint8Array(
      await crypto.subtle.exportKey('raw', keyA),
    );
    const exportedB = new Uint8Array(
      await crypto.subtle.exportKey('raw', keyB),
    );

    expect(exportedA).toHaveLength(32);
    expect(Array.from(exportedA)).toEqual(Array.from(exportedB));
  });
});
