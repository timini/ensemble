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

function ensureCrypto(): Crypto {
  const cryptoImplementation = globalThis.crypto;
  if (!cryptoImplementation?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  return cryptoImplementation;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  if (typeof btoa === 'function') {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  const nodeBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(buffer).toString('base64');
  }

  throw new Error('Base64 encoding is not supported in this environment.');
}

function base64ToBuffer(base64: string): ArrayBuffer {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const nodeBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (nodeBuffer) {
    const decoded = nodeBuffer.from(base64, 'base64');
    return Uint8Array.from(decoded).buffer;
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

  const ivBase64 = bufferToBase64(iv.buffer);
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

  const ivBuffer = base64ToBuffer(ivPart);
  const payloadBuffer = base64ToBuffer(payloadPart);

  try {
    const decryptedBuffer = await cryptoImplementation.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      payloadBuffer,
    );

    return textDecoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error('Failed to decrypt payload.');
  }
}
