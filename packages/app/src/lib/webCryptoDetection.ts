/**
 * Detects whether the current environment supports the Web Crypto API.
 *
 * Free Mode requires Web Crypto to encrypt API keys locally before persisting them.
 */
export function isWebCryptoAvailable(): boolean {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  const cryptoImplementation = (globalThis as { crypto?: Crypto }).crypto;
  return Boolean(cryptoImplementation && cryptoImplementation.subtle);
}
