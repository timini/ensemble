import {
  encrypt,
  isLegacyCiphertext,
} from "@ensemble-ai/shared-utils/security";

/**
 * A stored key's ciphertext, moved to the device key when it was made with
 * the legacy derived key. Unchanged when it already uses the device key, or
 * when this browser has no device key (no IndexedDB), so a legacy
 * ciphertext is not rewritten on every load for nothing.
 */
export async function reencryptLegacy(
  ciphertext: string,
  plaintext: string,
): Promise<string> {
  if (!isLegacyCiphertext(ciphertext)) return ciphertext;
  const fresh = await encrypt(plaintext);
  return isLegacyCiphertext(fresh) ? ciphertext : fresh;
}
