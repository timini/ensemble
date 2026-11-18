/**
 * Encryption of provider keys at rest in the browser (Free mode).
 *
 * AES-256-GCM through the Web Crypto API. The key is a random, non-extractable
 * CryptoKey made once per browser profile and kept in IndexedDB: page script
 * can use it but cannot read its bytes, so a copy of localStorage (a disk
 * image, a synced profile, a leaked backup) cannot be decrypted elsewhere.
 * Script running on the page itself can still decrypt, so this protects keys
 * at rest, not against XSS. New ciphertexts start with `v2:`.
 *
 * Older ciphertexts (no prefix) were made with a key derived from browser
 * properties, which anyone could recompute. They still decrypt, and
 * `isLegacyCiphertext` tells callers to encrypt them again with the device key.
 * Where IndexedDB is missing, the legacy key is still used.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let cachedKey: CryptoKey | null = null;
let deviceKeyPromise: Promise<CryptoKey | null> | null = null;

const KEY_DB = "ensemble-ai-keys";
const KEY_STORE = "keys";
const DEVICE_KEY_ID = "device";
const V2_PREFIX = "v2:";

type BufferLike = ArrayBuffer | ArrayBufferView;

function ensureCrypto(): Crypto {
  const cryptoImplementation = globalThis.crypto;
  if (!cryptoImplementation?.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  return cryptoImplementation;
}

function toArrayBuffer(buffer: BufferLike): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  }

  const viewCandidate = buffer as ArrayBufferView & { buffer: ArrayBuffer };
  if (
    typeof viewCandidate?.byteOffset === "number" &&
    typeof viewCandidate?.byteLength === "number" &&
    viewCandidate.buffer
  ) {
    return viewCandidate.buffer.slice(
      viewCandidate.byteOffset,
      viewCandidate.byteOffset + viewCandidate.byteLength,
    );
  }

  const maybeBufferObj = (buffer as { buffer?: unknown })?.buffer;
  if (maybeBufferObj instanceof ArrayBuffer) {
    const byteLength = (buffer as { length?: number }).length as
      | number
      | undefined;
    if (typeof byteLength === "number") {
      return maybeBufferObj.slice(0, byteLength);
    }
    return maybeBufferObj;
  }

  const maybeArrayBuffer = buffer as {
    byteLength?: number;
    slice?: (start?: number, end?: number) => ArrayBuffer;
  };
  if (
    typeof maybeArrayBuffer?.byteLength === "number" &&
    typeof maybeArrayBuffer?.slice === "function"
  ) {
    return maybeArrayBuffer.slice(0);
  }

  throw new Error("Unsupported buffer type for base64 conversion.");
}

function bufferToBase64(buffer: BufferLike): string {
  const arrayBuffer = toArrayBuffer(buffer);

  if (typeof btoa === "function") {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  const nodeBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(arrayBuffer).toString("base64");
  }

  throw new Error("Base64 encoding is not supported in this environment.");
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    let index = 0;
    for (const char of binary) {
      bytes[index] = char.charCodeAt(0);
      index += 1;
    }
    return bytes;
  }

  const nodeBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (nodeBuffer) {
    const decoded = nodeBuffer.from(base64, "base64");
    const buffer = decoded.buffer.slice(
      decoded.byteOffset,
      decoded.byteOffset + decoded.byteLength,
    );
    return new Uint8Array(buffer);
  }

  throw new Error("Base64 decoding is not supported in this environment.");
}

function getDeviceEntropy(): Uint8Array {
  if (typeof window === "undefined") {
    return textEncoder.encode("server-entropy");
  }

  const navigatorInfo = [
    window.navigator.userAgent,
    window.navigator.language,
    window.navigator.platform,
    window.navigator.hardwareConcurrency?.toString() ?? "",
  ].join("|");

  const screenInfo =
    typeof window.screen !== "undefined"
      ? [
          window.screen.width,
          window.screen.height,
          window.screen.colorDepth,
          window.devicePixelRatio,
        ].join("x")
      : "";

  const timeZone =
    typeof Intl !== "undefined"
      ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "")
      : "";

  const entropyString = `${navigatorInfo}|${screenInfo}|${timeZone}`.trim();

  return textEncoder.encode(
    entropyString.length > 0 ? entropyString : "fallback-entropy",
  );
}

/** The legacy key derived from browser properties. Only for ciphertexts made before the device key. */
export async function deriveKey(): Promise<CryptoKey> {
  if (cachedKey) {
    return cachedKey;
  }

  const cryptoImplementation = ensureCrypto();
  const entropy = getDeviceEntropy();
  const hash = await cryptoImplementation.subtle.digest(
    "SHA-256",
    entropy as unknown as BufferSource,
  );

  cachedKey = await cryptoImplementation.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  return cachedKey;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function loadOrCreateDeviceKey(): Promise<CryptoKey | null> {
  const idb = globalThis.indexedDB;
  if (!idb) return null;
  const open = idb.open(KEY_DB, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(KEY_STORE);
  const db = await requestResult(open);
  try {
    const read = db
      .transaction(KEY_STORE, "readonly")
      .objectStore(KEY_STORE)
      .get(DEVICE_KEY_ID);
    const existing = (await requestResult(read)) as CryptoKey | undefined;
    if (existing) return existing;
    const created = await ensureCrypto().subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    try {
      // add() fails if another tab stored a key first; that key then wins.
      await requestResult(
        db
          .transaction(KEY_STORE, "readwrite")
          .objectStore(KEY_STORE)
          .add(created, DEVICE_KEY_ID),
      );
      return created;
    } catch {
      const again = db
        .transaction(KEY_STORE, "readonly")
        .objectStore(KEY_STORE)
        .get(DEVICE_KEY_ID);
      return ((await requestResult(again)) as CryptoKey | undefined) ?? null;
    }
  } finally {
    db.close();
  }
}

/**
 * The browser's random, non-extractable device key from IndexedDB, made on
 * first use. Null where IndexedDB is not available or fails.
 */
export function getDeviceKey(): Promise<CryptoKey | null> {
  deviceKeyPromise ??= loadOrCreateDeviceKey().catch(() => {
    deviceKeyPromise = null;
    return null;
  });
  return deviceKeyPromise;
}

/** Forgets the cached keys. For tests. */
export function resetEncryptionKeyCache(): void {
  cachedKey = null;
  deviceKeyPromise = null;
}

/**
 * The device key could not be loaded (IndexedDB blocked or failing). The
 * ciphertext may still be fine, so callers should keep it and try again on
 * a later visit rather than discard it.
 */
export class EncryptionKeyUnavailableError extends Error {
  constructor() {
    super("The encryption key is not available in this browser right now.");
    this.name = "EncryptionKeyUnavailableError";
  }
}

/** True for a ciphertext made with the old derived key, which should be encrypted again. */
export function isLegacyCiphertext(ciphertext: string): boolean {
  return !ciphertext.startsWith(V2_PREFIX);
}

export async function encrypt(plaintext: string): Promise<string> {
  const cryptoImplementation = ensureCrypto();
  const deviceKey = await getDeviceKey();
  const key = deviceKey ?? (await deriveKey());

  const iv = new Uint8Array(12);
  cryptoImplementation.getRandomValues(iv);

  const encoded = textEncoder.encode(plaintext);
  const encryptedBuffer = await cryptoImplementation.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  const ivBase64 = bufferToBase64(iv);
  const payloadBase64 = bufferToBase64(encryptedBuffer);

  return `${deviceKey ? V2_PREFIX : ""}${ivBase64}:${payloadBase64}`;
}

export async function decrypt(ciphertext: string): Promise<string> {
  const cryptoImplementation = ensureCrypto();
  const legacy = isLegacyCiphertext(ciphertext);
  const key = legacy ? await deriveKey() : await getDeviceKey();
  if (!key) {
    throw new EncryptionKeyUnavailableError();
  }

  const [ivPart, payloadPart] = (
    legacy ? ciphertext : ciphertext.slice(V2_PREFIX.length)
  ).split(":");
  if (!ivPart || !payloadPart) {
    throw new Error("Encrypted payload is malformed.");
  }

  const ivBytes = base64ToUint8Array(ivPart);
  const payloadBytes = base64ToUint8Array(payloadPart);
  const payloadBuffer = toArrayBuffer(payloadBytes);

  try {
    const decryptedBuffer = await cryptoImplementation.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes },
      key,
      payloadBuffer,
    );

    return textDecoder.decode(decryptedBuffer);
  } catch {
    throw new Error("Failed to decrypt payload.");
  }
}
