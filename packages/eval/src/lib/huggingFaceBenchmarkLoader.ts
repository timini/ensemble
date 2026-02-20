import { readFile, unlink } from 'node:fs/promises';
import type {
  BenchmarkDatasetName,
  BenchmarkLoader,
  BenchmarkQuestion,
  DatasetLoadOptions,
} from '../types.js';
import {
  checksumPath,
  computeSha256,
  verifyCacheIntegrity,
  writeChecksumFile,
} from './datasetChecksum.js';
import { fileExists, readJsonFile, writeJsonFile } from './io.js';
import { createCachePath, shuffleAndSample } from './benchmarkDatasetShared.js';

const HUGGING_FACE_ROWS_ENDPOINT = 'https://datasets-server.huggingface.co/rows';
const PAGE_SIZE = 100;
const MAX_ROWS = 15_000;
const FETCH_TIMEOUT_MS = 30_000;
const RATE_LIMIT_MAX_RETRIES = 5;
const RATE_LIMIT_BASE_DELAY_MS = 5_000;

interface HuggingFaceRowsResponse<TRow> {
  rows: Array<{ row_idx: number; row: TRow }>;
  num_rows_total?: number;
}

export interface HuggingFaceSource {
  dataset: string;
  config: string;
  split: string;
}

interface HuggingFaceLoaderConfig<TRow> {
  name: BenchmarkDatasetName;
  sources: HuggingFaceSource[];
  mapRow: (row: TRow, rowIdx: number) => BenchmarkQuestion;
  filterRow?: (row: TRow) => boolean;
}

async function fetchRowsPage<TRow>(
  source: HuggingFaceSource,
  offset: number,
): Promise<HuggingFaceRowsResponse<TRow>> {
  const url = new URL(HUGGING_FACE_ROWS_ENDPOINT);
  url.searchParams.set('dataset', source.dataset);
  url.searchParams.set('config', source.config);
  url.searchParams.set('split', source.split);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('length', String(PAGE_SIZE));

  const headers: Record<string, string> = {};
  const hfToken = process.env.HF_TOKEN;
  if (hfToken) {
    headers['Authorization'] = `Bearer ${hfToken}`;
  }

  let response: Response | undefined;
  for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const isRetryable = response.status === 429 || (response.status >= 500 && response.status < 600);
    if (!isRetryable) break;
    if (attempt < RATE_LIMIT_MAX_RETRIES) {
      const delay = RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt;
      const reason = response.status === 429 ? 'Rate limited' : `Server error ${response.status}`;
      process.stderr.write(
        `${reason} by HuggingFace, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${RATE_LIMIT_MAX_RETRIES})...\n`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  if (!response!.ok) {
    const body = await response!.text();
    throw new Error(
      `Failed to fetch ${source.dataset}/${source.config}/${source.split} (${response!.status}): ${body}`,
    );
  }

  const parsed = (await response!.json()) as HuggingFaceRowsResponse<TRow>;
  if (!Array.isArray(parsed.rows)) {
    throw new Error(
      `Unexpected rows response for ${source.dataset}/${source.config}/${source.split}`,
    );
  }

  return parsed;
}

async function fetchAllRows<TRow>(
  source: HuggingFaceSource,
): Promise<Array<{ row_idx: number; row: TRow }>> {
  const rows: Array<{ row_idx: number; row: TRow }> = [];
  let offset = 0;
  let totalRows: number | undefined;

  while (true) {
    const page = await fetchRowsPage<TRow>(source, offset);
    if (rows.length + page.rows.length > MAX_ROWS) {
      throw new Error(`Dataset exceeds maximum supported rows (${MAX_ROWS})`);
    }
    rows.push(...page.rows);
    offset += page.rows.length;

    if (page.num_rows_total !== undefined) {
      totalRows = page.num_rows_total;
    }
    if (page.rows.length === 0 || page.rows.length < PAGE_SIZE) {
      break;
    }
    if (totalRows !== undefined && rows.length >= totalRows) {
      break;
    }
  }

  return rows;
}

export class HuggingFaceBenchmarkLoader<TRow> implements BenchmarkLoader {
  readonly name: BenchmarkDatasetName;
  private readonly sources: HuggingFaceSource[];
  private readonly mapRow: (row: TRow, rowIdx: number) => BenchmarkQuestion;
  private readonly filterRow?: (row: TRow) => boolean;

  constructor(config: HuggingFaceLoaderConfig<TRow>) {
    this.name = config.name;
    this.sources = config.sources;
    this.mapRow = config.mapRow;
    this.filterRow = config.filterRow;
  }

  async load(options?: DatasetLoadOptions): Promise<BenchmarkQuestion[]> {
    const cachePath = createCachePath(this.name);
    const questions = await this.loadWithIntegrity(cachePath, options);
    return shuffleAndSample(questions, options?.sample, {
      shuffle: options?.shuffle,
      seed: options?.seed,
    });
  }

  private async loadWithIntegrity(
    cachePath: string,
    options?: DatasetLoadOptions,
  ): Promise<BenchmarkQuestion[]> {
    const skipDownload = options?.skipDownload ?? false;
    const forceDownload = options?.forceDownload ?? false;

    if (skipDownload && forceDownload) {
      throw new Error('--skip-download and --force-download are mutually exclusive.');
    }

    if (forceDownload) {
      return this.downloadAndCache(cachePath);
    }

    const cacheExists = await fileExists(cachePath);

    if (!cacheExists) {
      if (skipDownload) {
        throw new Error(
          `Dataset "${this.name}" is not cached at ${cachePath} and --skip-download is set. ` +
            `Download the dataset first without --skip-download.`,
        );
      }
      return this.downloadAndCache(cachePath);
    }

    // Cache exists - verify integrity
    const integrity = await verifyCacheIntegrity(cachePath);
    switch (integrity) {
      case 'valid':
        return readJsonFile<BenchmarkQuestion[]>(cachePath);
      case 'no-checksum': {
        // Legacy cache without checksum - generate one and return
        const content = await readFile(cachePath, 'utf-8');
        await writeChecksumFile(cachePath, computeSha256(content));
        return JSON.parse(content) as BenchmarkQuestion[];
      }
      case 'mismatch': {
        process.stderr.write(
          `Warning: checksum mismatch for cached dataset "${this.name}" at ${cachePath}.\n`,
        );
        if (skipDownload) {
          throw new Error(
            `Dataset "${this.name}" has a checksum mismatch and --skip-download is set. ` +
              `Re-download the dataset with --force-download.`,
          );
        }
        process.stderr.write('Re-downloading...\n');
        return this.downloadAndCache(cachePath);
      }
      default:
        // Should not happen, but fall through to download
        return this.downloadAndCache(cachePath);
    }
  }

  private async downloadAndCache(cachePath: string): Promise<BenchmarkQuestion[]> {
    // Remove existing cache and checksum if present
    await Promise.all([
      unlink(cachePath).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== 'ENOENT') throw err;
      }),
      unlink(checksumPath(cachePath)).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== 'ENOENT') throw err;
      }),
    ]);

    const questions = await this.downloadQuestions();
    await writeJsonFile(cachePath, questions);

    // Compute checksum from what was actually written to disk
    const content = await readFile(cachePath, 'utf-8');
    await writeChecksumFile(cachePath, computeSha256(content));

    return questions;
  }

  private async downloadQuestions(): Promise<BenchmarkQuestion[]> {
    const errors: string[] = [];

    for (const source of this.sources) {
      let rows: Array<{ row_idx: number; row: TRow }>;
      try {
        rows = await fetchAllRows<TRow>(source);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
        continue;
      }

      // Mapping failures indicate malformed rows or parser bugs and should fail fast.
      const filtered = this.filterRow
        ? rows.filter((entry) => this.filterRow!(entry.row))
        : rows;
      const questions = filtered.map((entry) => this.mapRow(entry.row, entry.row_idx));
      if (questions.length === 0) {
        errors.push(
          `Dataset ${source.dataset}/${source.config}/${source.split} returned no rows`,
        );
        continue;
      }
      return questions;
    }

    throw new Error(
      `Unable to download dataset ${this.name}. Attempts failed:\n${errors.join('\n')}`,
    );
  }
}
