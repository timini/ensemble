import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileExists } from './io.js';

/**
 * Compute the SHA-256 hash of the given data string.
 */
export function computeSha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

/**
 * Return the sidecar path for a dataset cache file.
 * E.g. `/path/to/gsm8k.json` -> `/path/to/gsm8k.json.sha256`
 */
export function checksumPath(cachePath: string): string {
  return `${cachePath}.sha256`;
}

/**
 * Write a SHA-256 checksum sidecar file next to the cached dataset.
 */
export async function writeChecksumFile(cachePath: string, hash: string): Promise<void> {
  await writeFile(checksumPath(cachePath), hash, 'utf-8');
}

/**
 * Read the stored SHA-256 checksum from the sidecar file.
 * Returns null if the sidecar file does not exist.
 */
export async function readChecksumFile(cachePath: string): Promise<string | null> {
  const path = checksumPath(cachePath);
  if (!(await fileExists(path))) {
    return null;
  }
  const content = await readFile(path, 'utf-8');
  return content.trim();
}

/**
 * Verify the integrity of a cached dataset file against its sidecar checksum.
 *
 * Returns:
 * - 'valid' if the file exists and the hash matches
 * - 'mismatch' if the file exists but the hash does not match
 * - 'no-checksum' if the cache file exists but there is no sidecar checksum file
 * - 'missing' if the cache file itself does not exist
 */
export async function verifyCacheIntegrity(
  cachePath: string,
): Promise<'valid' | 'mismatch' | 'no-checksum' | 'missing'> {
  if (!(await fileExists(cachePath))) {
    return 'missing';
  }

  const storedHash = await readChecksumFile(cachePath);
  if (storedHash === null) {
    return 'no-checksum';
  }

  const fileContent = await readFile(cachePath, 'utf-8');
  const actualHash = computeSha256(fileContent);

  return actualHash === storedHash ? 'valid' : 'mismatch';
}
