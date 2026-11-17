import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists, readJsonFile } from '../io.js';
import type { BenchmarkResultsFile } from '../../types.js';

/** Hint for a missing path: npm runs workspace scripts from the package directory. */
export const PATH_HINT =
  'npm runs workspace scripts from packages/eval, so give paths relative to it (results/<run-id>) or absolute.';

/**
 * Benchmark results files in matrix run directories: `<dir>/<dataset>/<name>`
 * for each name, or a results file given directly.
 */
export async function readResultFiles(paths: string[], names: string[]): Promise<BenchmarkResultsFile[]> {
  const files: BenchmarkResultsFile[] = [];
  for (const path of paths) {
    if (!(await fileExists(path))) throw new Error(`${path} does not exist. ${PATH_HINT}`);
    if (path.endsWith('.json')) {
      files.push(await readJsonFile<BenchmarkResultsFile>(path));
      continue;
    }
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      for (const name of names) {
        const file = join(path, entry.name, name);
        if (await fileExists(file)) files.push(await readJsonFile<BenchmarkResultsFile>(file));
      }
    }
  }
  return files;
}

/** True when any of the files came from a mock run (mock provider, no real answers). */
export function hasMockResults(files: BenchmarkResultsFile[]): boolean {
  return files.some((file) => file.mode !== 'free');
}
