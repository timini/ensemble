import type {
  BenchmarkDatasetName,
  BenchmarkLoader,
  BenchmarkQuestion,
} from '../types.js';
import { fileExists, readJsonFile, writeJsonFile } from './io.js';
import { createCachePath, normalizeSample } from './benchmarkDatasetShared.js';

const HUGGING_FACE_ROWS_ENDPOINT = 'https://datasets-server.huggingface.co/rows';
const PAGE_SIZE = 100;
const MAX_ROWS = 5000;

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

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch ${source.dataset}/${source.config}/${source.split} (${response.status}): ${body}`,
    );
  }

  const parsed = (await response.json()) as HuggingFaceRowsResponse<TRow>;
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
    rows.push(...page.rows);
    offset += page.rows.length;

    if (rows.length > MAX_ROWS) {
      throw new Error(`Dataset exceeds maximum supported rows (${MAX_ROWS})`);
    }

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

  constructor(config: HuggingFaceLoaderConfig<TRow>) {
    this.name = config.name;
    this.sources = config.sources;
    this.mapRow = config.mapRow;
  }

  async load(options?: { sample?: number }): Promise<BenchmarkQuestion[]> {
    const cachePath = createCachePath(this.name);

    let questions: BenchmarkQuestion[];
    if (await fileExists(cachePath)) {
      questions = await readJsonFile<BenchmarkQuestion[]>(cachePath);
    } else {
      questions = await this.downloadQuestions();
      await writeJsonFile(cachePath, questions);
    }

    const sampleSize = normalizeSample(options?.sample, questions.length);
    return questions.slice(0, sampleSize);
  }

  private async downloadQuestions(): Promise<BenchmarkQuestion[]> {
    const errors: string[] = [];

    for (const source of this.sources) {
      try {
        const rows = await fetchAllRows<TRow>(source);
        const questions = rows.map((entry) => this.mapRow(entry.row, entry.row_idx));
        if (questions.length === 0) {
          throw new Error('Dataset returned no rows');
        }
        return questions;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
      }
    }

    throw new Error(
      `Unable to download dataset ${this.name}. Attempts failed:\n${errors.join('\n')}`,
    );
  }
}
