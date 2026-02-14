import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  BenchmarkDatasetName,
  BenchmarkLoader,
  BenchmarkQuestion,
} from '../types.js';
import { fileExists, readJsonFile, writeJsonFile } from './io.js';

const HUGGING_FACE_ROWS_ENDPOINT = 'https://datasets-server.huggingface.co/rows';
const PAGE_SIZE = 100;

const DATASET_ALIASES: Record<string, BenchmarkDatasetName> = {
  gsm8k: 'gsm8k',
  truthfulqa: 'truthfulqa',
  truthful_qa: 'truthfulqa',
  gpqa: 'gpqa',
  'gpqa-diamond': 'gpqa',
  gpqa_diamond: 'gpqa',
};

interface HuggingFaceRowsResponse<TRow> {
  rows: Array<{ row_idx: number; row: TRow }>;
  num_rows_total?: number;
}

interface HuggingFaceSource {
  dataset: string;
  config: string;
  split: string;
}

interface HuggingFaceLoaderConfig<TRow> {
  name: BenchmarkDatasetName;
  sources: HuggingFaceSource[];
  mapRow: (row: TRow, rowIdx: number) => BenchmarkQuestion;
}

interface Gsm8kRow {
  question: string;
  answer: string;
}

interface MultipleChoiceTargets {
  choices: string[];
  labels: number[];
}

interface TruthfulQaRow {
  question: string;
  mc1_targets: MultipleChoiceTargets;
}

interface GpqaRow {
  problem: string;
  solution: string;
  domain?: string;
}

interface PromptObject {
  prompt: string;
  groundTruth?: string;
  category?: string;
  difficulty?: string;
}

function getDatasetsDirectory(): string {
  const fromEnv = process.env.ENSEMBLE_EVAL_DATASETS_DIR;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv;
  }

  const currentFile = dirname(fileURLToPath(import.meta.url));
  return resolve(currentFile, '../../datasets');
}

function createCachePath(name: BenchmarkDatasetName): string {
  return resolve(getDatasetsDirectory(), `${name}.json`);
}

function normalizeDatasetName(dataset: string): BenchmarkDatasetName | null {
  const normalized = dataset.trim().toLowerCase();
  return DATASET_ALIASES[normalized] ?? null;
}

function normalizeSample(sample: number | undefined, total: number): number {
  if (sample === undefined) {
    return total;
  }
  if (!Number.isInteger(sample) || sample <= 0) {
    throw new Error(`Sample must be a positive integer. Received: ${sample}`);
  }

  return Math.min(sample, total);
}

function toChoiceLetter(index: number): string {
  const letterCode = 'A'.charCodeAt(0) + index;
  return String.fromCharCode(letterCode);
}

function extractChoiceLetter(value: string): string | null {
  const boxedMatch = value.match(/\\boxed\{\s*([A-Z])\s*\}/i);
  if (boxedMatch) {
    return boxedMatch[1].toUpperCase();
  }

  const answerMatch = value.match(/\b(?:answer|option|choice)\s*[:\-]?\s*([A-Z])\b/i);
  if (answerMatch) {
    return answerMatch[1].toUpperCase();
  }

  const standalone = [...value.toUpperCase().matchAll(/\b([A-Z])\b/g)];
  if (standalone.length > 0) {
    return standalone[standalone.length - 1][1];
  }

  return null;
}

function extractNumericAnswer(value: string): string | null {
  const markerMatch = value.match(/####\s*([-+]?\d[\d,]*(?:\.\d+)?)/);
  if (markerMatch) {
    return markerMatch[1].replaceAll(',', '');
  }

  const matches = [...value.matchAll(/[-+]?\d[\d,]*(?:\.\d+)?/g)];
  if (matches.length === 0) {
    return null;
  }

  return matches[matches.length - 1][0].replaceAll(',', '');
}

function isPromptObject(value: unknown): value is PromptObject {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return typeof (value as PromptObject).prompt === 'string';
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

    if (page.num_rows_total !== undefined) {
      totalRows = page.num_rows_total;
    }

    if (page.rows.length === 0) {
      break;
    }
    if (totalRows !== undefined && rows.length >= totalRows) {
      break;
    }
    if (page.rows.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

class HuggingFaceBenchmarkLoader<TRow> implements BenchmarkLoader {
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

const gsm8kLoader = new HuggingFaceBenchmarkLoader<Gsm8kRow>({
  name: 'gsm8k',
  sources: [{ dataset: 'openai/gsm8k', config: 'main', split: 'test' }],
  mapRow: (row, rowIdx) => {
    const prompt = row.question.trim();
    const groundTruth = extractNumericAnswer(row.answer ?? '');
    if (!groundTruth) {
      throw new Error(`Failed to parse GSM8K answer at row ${rowIdx}`);
    }

    return {
      id: `gsm8k-${rowIdx}`,
      prompt,
      groundTruth,
    };
  },
});

const truthfulQaLoader = new HuggingFaceBenchmarkLoader<TruthfulQaRow>({
  name: 'truthfulqa',
  sources: [
    {
      dataset: 'truthfulqa/truthful_qa',
      config: 'multiple_choice',
      split: 'validation',
    },
  ],
  mapRow: (row, rowIdx) => {
    const choices = row.mc1_targets?.choices ?? [];
    const labels = row.mc1_targets?.labels ?? [];
    const correctIndex = labels.findIndex((label) => label === 1);

    if (choices.length === 0 || correctIndex < 0 || correctIndex >= choices.length) {
      throw new Error(`Failed to parse TruthfulQA answer at row ${rowIdx}`);
    }

    const options = choices
      .map((choice, index) => `${toChoiceLetter(index)}. ${choice}`)
      .join('\n');

    return {
      id: `truthfulqa-${rowIdx}`,
      prompt: `${row.question.trim()}\n\nOptions:\n${options}\n\nRespond with the single best option letter.`,
      groundTruth: toChoiceLetter(correctIndex),
    };
  },
});

const gpqaLoader = new HuggingFaceBenchmarkLoader<GpqaRow>({
  name: 'gpqa',
  sources: [
    { dataset: 'Idavidrein/gpqa', config: 'gpqa_diamond', split: 'train' },
    { dataset: 'hendrydong/gpqa_diamond_mc', config: 'default', split: 'test' },
  ],
  mapRow: (row, rowIdx) => {
    const groundTruth = extractChoiceLetter(row.solution ?? '');
    if (!groundTruth) {
      throw new Error(`Failed to parse GPQA answer at row ${rowIdx}`);
    }

    return {
      id: `gpqa-${rowIdx}`,
      prompt: row.problem.trim(),
      groundTruth,
      category: row.domain?.trim() || undefined,
    };
  },
});

const BENCHMARK_LOADERS: Record<BenchmarkDatasetName, BenchmarkLoader> = {
  gsm8k: gsm8kLoader,
  truthfulqa: truthfulQaLoader,
  gpqa: gpqaLoader,
};

async function loadLocalQuestions(
  datasetPath: string,
  sample?: number,
): Promise<BenchmarkQuestion[]> {
  const parsed = await readJsonFile<unknown>(datasetPath);
  if (!Array.isArray(parsed)) {
    throw new Error(`Dataset must be a JSON array: ${datasetPath}`);
  }

  const questions = parsed
    .map((entry, index): BenchmarkQuestion | null => {
      if (typeof entry === 'string') {
        const prompt = entry.trim();
        if (!prompt) {
          return null;
        }

        return {
          id: `local-${index}`,
          prompt,
          groundTruth: '',
        };
      }

      if (!isPromptObject(entry)) {
        return null;
      }

      const prompt = entry.prompt.trim();
      if (!prompt) {
        return null;
      }

      return {
        id: `local-${index}`,
        prompt,
        groundTruth: entry.groundTruth?.trim() ?? '',
        category: entry.category?.trim(),
        difficulty: entry.difficulty?.trim(),
      };
    })
    .filter((entry): entry is BenchmarkQuestion => entry !== null);

  if (questions.length === 0) {
    throw new Error(`Dataset did not contain any prompts: ${datasetPath}`);
  }

  const sampleSize = normalizeSample(sample, questions.length);
  return questions.slice(0, sampleSize);
}

export function resolveBenchmarkDatasetName(
  dataset: string,
): BenchmarkDatasetName | null {
  return normalizeDatasetName(dataset);
}

export function getBenchmarkLoader(name: BenchmarkDatasetName): BenchmarkLoader {
  return BENCHMARK_LOADERS[name];
}

export async function loadBenchmarkQuestions(
  dataset: string,
  options?: { sample?: number },
): Promise<{ datasetName: BenchmarkDatasetName | null; questions: BenchmarkQuestion[] }> {
  const datasetName = normalizeDatasetName(dataset);
  if (!datasetName) {
    return {
      datasetName: null,
      questions: await loadLocalQuestions(dataset, options?.sample),
    };
  }

  const loader = getBenchmarkLoader(datasetName);
  return {
    datasetName,
    questions: await loader.load(options),
  };
}
