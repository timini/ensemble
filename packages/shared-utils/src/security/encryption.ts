/**
 * Encryption utilities (Phase 3 - Free Mode)
 *
 * Provides AES-256-GCM helpers backed by the Web Crypto API. Keys are derived from
 * device-specific entropy so encrypted payloads can be decrypted on subsequent visits
 * without prompting the user for a password.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let cachedKey: CryptoKey | null = null;

type BufferLike = ArrayBuffer | ArrayBufferView;

function ensureCrypto(): Crypto {
  const cryptoImplementation = globalThis.crypto;
  if (!cryptoImplementation?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  return cryptoImplementation;
}

function toArrayBuffer(buffer: BufferLike): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  }

  const viewCandidate = buffer as ArrayBufferView & { buffer: ArrayBuffer };
  if (typeof viewCandidate?.byteOffset === 'number' && typeof viewCandidate?.byteLength === 'number' && viewCandidate.buffer) {
    return viewCandidate.buffer.slice(viewCandidate.byteOffset, viewCandidate.byteOffset + viewCandidate.byteLength);
  }

  const maybeBufferObj = (buffer as { buffer?: unknown })?.buffer;
  if (maybeBufferObj instanceof ArrayBuffer) {
    const byteLength = (buffer as { length?: number }).length as number | undefined;
    if (typeof byteLength === 'number') {
      return maybeBufferObj.slice(0, byteLength);
    }
    return maybeBufferObj;
  }

  const maybeArrayBuffer = buffer as { byteLength?: number; slice?: (start?: number, end?: number) => ArrayBuffer };
  if (typeof maybeArrayBuffer?.byteLength === 'number' && typeof maybeArrayBuffer?.slice === 'function') {
    return maybeArrayBuffer.slice(0);
  }

  throw new Error('Unsupported buffer type for base64 conversion.');
}

function bufferToBase64(buffer: BufferLike): string {
  const arrayBuffer = toArrayBuffer(buffer);

  if (typeof btoa === 'function') {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  const nodeBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(arrayBuffer).toString('base64');
  }

  throw new Error('Base64 encoding is not supported in this environment.');
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  if (typeof atob === 'function') {
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
    const decoded = nodeBuffer.from(base64, 'base64');
    const buffer = decoded.buffer.slice(
      decoded.byteOffset,
      decoded.byteOffset + decoded.byteLength,
    );
    return new Uint8Array(buffer);
  }

  throw new Error('Base64 decoding is not supported in this environment.');
}

function getDeviceEntropy(): Uint8Array {
  if (typeof window === 'undefined') {
    return textEncoder.encode('server-entropy');
  }

  const navigatorInfo = [
    window.navigator.userAgent,
    window.navigator.language,
    window.navigator.platform,
    window.navigator.hardwareConcurrency?.toString() ?? '',
  ].join('|');

  const screenInfo =
    typeof window.screen !== 'undefined'
      ? [
          window.screen.width,
          window.screen.height,
          window.screen.colorDepth,
          window.devicePixelRatio,
        ].join('x')
      : '';

  const timeZone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
      : '';

  const entropyString = `${navigatorInfo}|${screenInfo}|${timeZone}`.trim();

  return textEncoder.encode(entropyString.length > 0 ? entropyString : 'fallback-entropy');
}

export async function deriveKey(): Promise<CryptoKey> {
  if (cachedKey) {
    return cachedKey;
  }

  const cryptoImplementation = ensureCrypto();
  const entropy = getDeviceEntropy();
  const hash = await cryptoImplementation.subtle.digest(
    'SHA-256',
    entropy as unknown as BufferSource,
  );

  cachedKey = await cryptoImplementation.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  return cachedKey;
}

export async function encrypt(plaintext: string): Promise<string> {
  const cryptoImplementation = ensureCrypto();
  const key = await deriveKey();

  const iv = new Uint8Array(12);
  cryptoImplementation.getRandomValues(iv);

  const encoded = textEncoder.encode(plaintext);
  const encryptedBuffer = await cryptoImplementation.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  const ivBase64 = bufferToBase64(iv);
  const payloadBase64 = bufferToBase64(encryptedBuffer);

  return `${ivBase64}:${payloadBase64}`;
}

export async function decrypt(ciphertext: string): Promise<string> {
  const cryptoImplementation = ensureCrypto();
  const key = await deriveKey();

  const [ivPart, payloadPart] = ciphertext.split(':');
  if (!ivPart || !payloadPart) {
    throw new Error('Encrypted payload is malformed.');
  }

  const ivBytes = base64ToUint8Array(ivPart);
  const payloadBytes = base64ToUint8Array(payloadPart);
  const payloadBuffer = toArrayBuffer(payloadBytes);

  try {
    const decryptedBuffer = await cryptoImplementation.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      payloadBuffer,
    );

    return textDecoder.decode(decryptedBuffer);
  } catch {
    throw new Error('Failed to decrypt payload.');
  }
}
