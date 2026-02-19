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

interface ArcRow {
  id: string;
  question: string;
  choices: { label: string[]; text: string[] };
  answerKey: string;
}

interface HellaSwagRow {
  ctx: string;
  endings: string[];
  label: string;
}

interface HalluMixRow {
  documents: string[];
  answer: string;
  hallucination_label: number;
  src: string;
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

function mapArcRow(row: ArcRow, rowIdx: number): BenchmarkQuestion {
  const labels = row.choices?.label ?? [];
  const texts = row.choices?.text ?? [];

  // ARC uses either letter keys (A/B/C/D) or numeric keys (1/2/3/4).
  // Normalize to letters so evaluation always compares A/B/C/D.
  const labelToLetter = new Map(
    labels.map((label, index) => [label, toChoiceLetter(index)]),
  );

  const options = labels
    .map((_label, index) => `${toChoiceLetter(index)}. ${texts[index]}`)
    .join('\n');

  const normalizedKey = labelToLetter.get(row.answerKey) ?? row.answerKey;

  return {
    id: `arc-${rowIdx}`,
    prompt: `${row.question.trim()}\n\nOptions:\n${options}\n\nRespond with the single best option letter.`,
    groundTruth: normalizedKey,
  };
}

function mapHellaSwagRow(row: HellaSwagRow, rowIdx: number): BenchmarkQuestion {
  const endings = row.endings ?? [];
  const options = endings
    .map((ending, index) => `${toChoiceLetter(index)}. ${ending}`)
    .join('\n');

  const correctIndex = Number.parseInt(row.label, 10);
  if (Number.isNaN(correctIndex) || correctIndex < 0 || correctIndex >= endings.length) {
    throw new Error(`Failed to parse HellaSwag label at row ${rowIdx}`);
  }

  return {
    id: `hellaswag-${rowIdx}`,
    prompt: `Complete the following:\n\n${row.ctx.trim()}\n\nOptions:\n${options}\n\nRespond with the single best option letter.`,
    groundTruth: toChoiceLetter(correctIndex),
  };
}

function mapHalluMixRow(row: HalluMixRow, rowIdx: number): BenchmarkQuestion {
  const docs = (row.documents ?? [])
    .map((doc, i) => `[Document ${i + 1}]\n${doc}`)
    .join('\n\n');

  const isHallucinated = row.hallucination_label === 1;

  return {
    id: `hallumix-${rowIdx}`,
    prompt: `Given the following documents and a proposed answer, determine if the answer is supported by the documents or is a hallucination.\n\nDocuments:\n${docs}\n\nProposed answer: ${row.answer}\n\nIs this answer a hallucination? Respond with only "yes" or "no".`,
    groundTruth: isHallucinated ? 'yes' : 'no',
    category: row.src?.trim() || undefined,
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
  arc: new HuggingFaceBenchmarkLoader<ArcRow>({
    name: 'arc',
    sources: [{ dataset: 'allenai/ai2_arc', config: 'ARC-Challenge', split: 'test' }],
    mapRow: mapArcRow,
  }),
  hellaswag: new HuggingFaceBenchmarkLoader<HellaSwagRow>({
    name: 'hellaswag',
    sources: [{ dataset: 'Rowan/hellaswag', config: 'default', split: 'validation' }],
    mapRow: mapHellaSwagRow,
  }),
  hallumix: new HuggingFaceBenchmarkLoader<HalluMixRow>({
    name: 'hallumix',
    sources: [{ dataset: 'quotientai/HalluMix', config: 'default', split: 'test' }],
    mapRow: mapHalluMixRow,
  }),
};
