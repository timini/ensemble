import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists, readJsonFile } from '../io.js';
import type { BenchmarkResultsFile } from '../../types.js';

/**
 * Benchmark results files in matrix run directories: `<dir>/<dataset>/<name>`
 * for each name, or a results file given directly.
 */
export async function readResultFiles(paths: string[], names: string[]): Promise<BenchmarkResultsFile[]> {
  const files: BenchmarkResultsFile[] = [];
  for (const path of paths) {
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
