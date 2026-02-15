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
};
