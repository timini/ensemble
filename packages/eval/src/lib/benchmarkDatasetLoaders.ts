import type {
  BenchmarkDatasetName,
  BenchmarkLoader,
  BenchmarkQuestion,
} from '../types.js';
import { HuggingFaceBenchmarkLoader } from './huggingFaceBenchmarkLoader.js';
import { toChoiceLetter } from './benchmarkDatasetShared.js';
import { extractChoiceLetter, extractNumericAnswer } from './parsers.js';

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

interface HleRow {
  question: string;
  answer: string;
  image: string;
  question_type: string;
  subject: string;
}

interface Math500Row {
  problem: string;
  solution: string;
  answer: string;
  subject: string;
  level: number;
}

interface MmluProRow {
  question_id: number;
  question: string;
  options: string[];
  answer: string;
  answer_index: number;
  category: string;
  src: string;
}

interface SimpleQaRow {
  metadata: string;
  problem: string;
  answer: string;
}

function mapGsm8kRow(row: Gsm8kRow, rowIdx: number): BenchmarkQuestion {
  const groundTruth = extractNumericAnswer(row.answer ?? '');
  if (!groundTruth) {
    throw new Error(`Failed to parse GSM8K answer at row ${rowIdx}`);
  }

  return {
    id: `gsm8k-${rowIdx}`,
    prompt: row.question.trim(),
    groundTruth,
  };
}

function mapTruthfulQaRow(row: TruthfulQaRow, rowIdx: number): BenchmarkQuestion {
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
}

function mapHleRow(row: HleRow, rowIdx: number): BenchmarkQuestion {
  return {
    id: `hle-${rowIdx}`,
    prompt: row.question.trim(),
    groundTruth: row.answer,
    category: row.subject?.trim() || undefined,
  };
}

function mapMath500Row(row: Math500Row, rowIdx: number): BenchmarkQuestion {
  return {
    id: `math500-${rowIdx}`,
    prompt: row.problem.trim(),
    groundTruth: row.answer,
    category: row.subject?.trim() || undefined,
    difficulty: String(row.level),
  };
}

function mapMmluProRow(row: MmluProRow, rowIdx: number): BenchmarkQuestion {
  const options = (row.options ?? [])
    .map((choice, index) => `${toChoiceLetter(index)}. ${choice}`)
    .join('\n');

  return {
    id: `mmlu_pro-${rowIdx}`,
    prompt: `${row.question.trim()}\n\nOptions:\n${options}\n\nRespond with the single best option letter.`,
    groundTruth: row.answer,
    category: row.category?.trim() || undefined,
  };
}

function mapSimpleQaRow(row: SimpleQaRow, rowIdx: number): BenchmarkQuestion {
  let category: string | undefined;
  try {
    const meta = JSON.parse(row.metadata);
    category = meta?.topic?.trim() || undefined;
  } catch {
    // metadata parsing failed, leave category undefined
  }

  return {
    id: `simpleqa-${rowIdx}`,
    prompt: row.problem.trim(),
    groundTruth: row.answer,
    category,
  };
}

function mapGpqaRow(row: GpqaRow, rowIdx: number): BenchmarkQuestion {
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
}

export const benchmarkLoaders: Record<BenchmarkDatasetName, BenchmarkLoader> = {
  gsm8k: new HuggingFaceBenchmarkLoader<Gsm8kRow>({
    name: 'gsm8k',
    sources: [{ dataset: 'openai/gsm8k', config: 'main', split: 'test' }],
    mapRow: mapGsm8kRow,
  }),
  truthfulqa: new HuggingFaceBenchmarkLoader<TruthfulQaRow>({
    name: 'truthfulqa',
    sources: [
      {
        dataset: 'truthfulqa/truthful_qa',
        config: 'multiple_choice',
        split: 'validation',
      },
    ],
    mapRow: mapTruthfulQaRow,
  }),
  gpqa: new HuggingFaceBenchmarkLoader<GpqaRow>({
    name: 'gpqa',
    sources: [
      { dataset: 'Idavidrein/gpqa', config: 'gpqa_diamond', split: 'train' },
      { dataset: 'hendrydong/gpqa_diamond_mc', config: 'default', split: 'test' },
    ],
    mapRow: mapGpqaRow,
  }),
  hle: new HuggingFaceBenchmarkLoader<HleRow>({
    name: 'hle',
    sources: [{ dataset: 'cais/hle', config: 'default', split: 'test' }],
    mapRow: mapHleRow,
    filterRow: (row) => !row.image,
  }),
  math500: new HuggingFaceBenchmarkLoader<Math500Row>({
    name: 'math500',
    sources: [{ dataset: 'HuggingFaceH4/MATH-500', config: 'default', split: 'test' }],
    mapRow: mapMath500Row,
  }),
  mmlu_pro: new HuggingFaceBenchmarkLoader<MmluProRow>({
    name: 'mmlu_pro',
    sources: [{ dataset: 'TIGER-Lab/MMLU-Pro', config: 'default', split: 'test' }],
    mapRow: mapMmluProRow,
  }),
  simpleqa: new HuggingFaceBenchmarkLoader<SimpleQaRow>({
    name: 'simpleqa',
    sources: [{ dataset: 'basicv8vc/SimpleQA', config: 'default', split: 'test' }],
    mapRow: mapSimpleQaRow,
  }),
};
