import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checksumPath,
  computeSha256,
  readChecksumFile,
  verifyCacheIntegrity,
  writeChecksumFile,
} from './datasetChecksum.js';

describe('computeSha256', () => {
  it('returns a 64-character hex string', () => {
    const hash = computeSha256('hello world');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns the same hash for the same input', () => {
    const h1 = computeSha256('test data');
    const h2 = computeSha256('test data');
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different inputs', () => {
    const h1 = computeSha256('data A');
    const h2 = computeSha256('data B');
    expect(h1).not.toBe(h2);
  });

  it('computes the known SHA-256 of empty string', () => {
    const hash = computeSha256('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('checksumPath', () => {
  it('appends .sha256 to the given path', () => {
    expect(checksumPath('/cache/gsm8k.json')).toBe('/cache/gsm8k.json.sha256');
  });
});

describe('writeChecksumFile / readChecksumFile', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'checksum-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes and reads back a checksum', async () => {
    const cachePath = join(tmpDir, 'data.json');
    const hash = 'abc123def456';
    await writeChecksumFile(cachePath, hash);
    const result = await readChecksumFile(cachePath);
    expect(result).toBe(hash);
  });

  it('returns null when no sidecar file exists', async () => {
    const cachePath = join(tmpDir, 'nonexistent.json');
    const result = await readChecksumFile(cachePath);
    expect(result).toBeNull();
  });

  it('trims whitespace from stored checksum', async () => {
    const cachePath = join(tmpDir, 'data.json');
    await writeFile(checksumPath(cachePath), '  abc123  \n', 'utf-8');
    const result = await readChecksumFile(cachePath);
    expect(result).toBe('abc123');
  });
});

describe('verifyCacheIntegrity', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'integrity-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns "missing" when cache file does not exist', async () => {
    const cachePath = join(tmpDir, 'absent.json');
    const result = await verifyCacheIntegrity(cachePath);
    expect(result).toBe('missing');
  });

  it('returns "no-checksum" when cache exists but sidecar does not', async () => {
    const cachePath = join(tmpDir, 'data.json');
    await writeFile(cachePath, '{"test": true}', 'utf-8');
    const result = await verifyCacheIntegrity(cachePath);
    expect(result).toBe('no-checksum');
  });

  it('returns "valid" when checksum matches file content', async () => {
    const cachePath = join(tmpDir, 'data.json');
    const content = '{"questions": []}';
    await writeFile(cachePath, content, 'utf-8');
    const hash = computeSha256(content);
    await writeChecksumFile(cachePath, hash);
    const result = await verifyCacheIntegrity(cachePath);
    expect(result).toBe('valid');
  });

  it('returns "mismatch" when checksum does not match file content', async () => {
    const cachePath = join(tmpDir, 'data.json');
    await writeFile(cachePath, '{"questions": []}', 'utf-8');
    await writeChecksumFile(cachePath, 'wrong_hash_value');
    const result = await verifyCacheIntegrity(cachePath);
    expect(result).toBe('mismatch');
  });
});
