import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decrypt,
  deriveKey,
  encrypt,
  EncryptionKeyUnavailableError,
  getDeviceKey,
  isLegacyCiphertext,
  resetEncryptionKeyCache,
} from "../encryption";

/** A ciphertext as the old code made it: derived key, no prefix. */
async function legacyEncrypt(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${Buffer.from(iv).toString("base64")}:${Buffer.from(data).toString("base64")}`;
}

describe("browser key encryption", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    resetEncryptionKeyCache();
  });

  it("encrypts with a random device key that cannot be exported", async () => {
    const ciphertext = await encrypt("sk-secret");
    expect(ciphertext.startsWith("v2:")).toBe(true);
    expect(isLegacyCiphertext(ciphertext)).toBe(false);
    expect(ciphertext).not.toContain("sk-secret");
    expect(await decrypt(ciphertext)).toBe("sk-secret");
    const key = await getDeviceKey();
    expect(key?.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", key!)).rejects.toThrow();
  });

  it("uses a fresh IV each time", async () => {
    const [a, b] = [await encrypt("same"), await encrypt("same")];
    expect(a).not.toBe(b);
  });

  it("keeps the device key across page loads (the key lives in IndexedDB)", async () => {
    const ciphertext = await encrypt("sk-secret");
    resetEncryptionKeyCache();
    expect(await decrypt(ciphertext)).toBe("sk-secret");
  });

  it("cannot decrypt with a different browser profile, unlike the old derived key", async () => {
    const ciphertext = await encrypt("sk-secret");
    globalThis.indexedDB = new IDBFactory();
    resetEncryptionKeyCache();
    await expect(decrypt(ciphertext)).rejects.toThrow(
      "Failed to decrypt payload.",
    );
  });

  it("still reads legacy ciphertexts and flags them for encrypting again", async () => {
    const legacy = await legacyEncrypt("sk-old");
    expect(isLegacyCiphertext(legacy)).toBe(true);
    expect(await decrypt(legacy)).toBe("sk-old");
  });

  it("falls back to the legacy key where IndexedDB is missing", async () => {
    vi.stubGlobal("indexedDB", undefined);
    resetEncryptionKeyCache();
    const ciphertext = await encrypt("sk-x");
    expect(isLegacyCiphertext(ciphertext)).toBe(true);
    expect(await decrypt(ciphertext)).toBe("sk-x");
    vi.unstubAllGlobals();
  });

  it('says the key is unavailable, rather than the payload bad, when IndexedDB fails', async () => {
    const ciphertext = await encrypt('sk-secret');
    vi.stubGlobal('indexedDB', undefined);
    resetEncryptionKeyCache();
    await expect(decrypt(ciphertext)).rejects.toBeInstanceOf(EncryptionKeyUnavailableError);
    vi.unstubAllGlobals();
  });
});
