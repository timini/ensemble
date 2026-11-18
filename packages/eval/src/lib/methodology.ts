/**
 * Question preparation for benchmark runs.
 *
 * Two answer protocols exist:
 * - `structured` (the default for new runs): multiple-choice options are
 *   shuffled with a fixed seed, every prompt asks for a structured final
 *   answer, and answers are scored mechanically where the dataset allows.
 * - `legacy`: prompts exactly as the loaders build them, unshuffled and
 *   scored by an LLM judge. Only used to score the committed caches in
 *   `.cache/`, which were generated that way.
 */
import type { BenchmarkDatasetName, BenchmarkQuestion, MultipleChoiceSource } from '../types.js';
import { seededRandom, shuffleArray, toChoiceLetter } from './benchmarkDatasetShared.js';
import { answerInstruction, type AnswerSpec } from './finalAnswer.js';

export type AnswerProtocol = 'structured' | 'legacy';

/** Seed for option shuffling. Changing it changes every shuffled prompt and invalidates caches. */
export const DEFAULT_OPTION_SEED = 1729;

export interface PrepareOptions {
  protocol: AnswerProtocol;
  /** Seed for option shuffling. Null keeps dataset order. Defaults to DEFAULT_OPTION_SEED. */
  optionSeed?: number | null;
}

/** Stable 32-bit hash of a question id, mixed into the seed so each question has its own order. */
function hashId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Shuffle options deterministically for one question. `permutation[i]` is
 * the dataset index of displayed option i.
 */
export function shuffleChoices(
  choices: readonly string[],
  correctIndex: number,
  seed: number,
  questionId: string,
): { choices: string[]; correctIndex: number; permutation: number[] } {
  const rand = seededRandom((seed ^ hashId(questionId)) | 0);
  const permutation = shuffleArray(
    choices.map((_, i) => i),
    rand,
  );
  return {
    choices: permutation.map((i) => choices[i]),
    correctIndex: permutation.indexOf(correctIndex),
    permutation,
  };
}

/** Write a multiple-choice prompt with the given options and closing line. */
export function buildChoicePrompt(source: MultipleChoiceSource, choices: readonly string[], footer: string): string {
  const lines = choices.map((choice, i) =>
    source.style === 'paren' ? `(${toChoiceLetter(i)}) ${choice}` : `${toChoiceLetter(i)}. ${choice}`,
  );
  const block = source.style === 'paren' ? lines.join('\n') : `Options:\n${lines.join('\n')}`;
  return `${source.stem}\n\n${block}${footer ? `\n\n${footer}` : ''}`;
}

/**
 * Split a problem whose options are written "(A) text" on their own lines
 * (GPQA) into stem, options and footer. Returns null unless the letters run
 * A, B, C... in order with at least two options.
 */
export function parseParenChoices(
  problem: string,
): { stem: string; choices: string[]; footer: string } | null {
  const matches = [...problem.matchAll(/^\(([A-Z])\)[ \t]+/gm)];
  if (matches.length < 2) return null;
  if (matches.some((m, i) => m[1] !== toChoiceLetter(i))) return null;

  const stem = problem.slice(0, matches[0].index).trim();
  const choices: string[] = [];
  let footer = '';
  matches.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? problem.length : problem.length;
    let text = problem.slice(start, end);
    if (i === matches.length - 1) {
      const gap = text.indexOf('\n\n');
      if (gap !== -1) {
        footer = text.slice(gap).trim();
        text = text.slice(0, gap);
      }
    }
    choices.push(text.trim());
  });
  if (!stem || choices.some((c) => !c)) return null;
  return { stem, choices, footer };
}

const CHOICE_DATASETS = new Set<BenchmarkDatasetName>(['truthfulqa', 'gpqa', 'mmlu_pro', 'arc', 'hellaswag']);

/** The expected answer shape for a question, or undefined for local datasets. */
export function answerSpecFor(
  dataset: BenchmarkDatasetName | null,
  question: BenchmarkQuestion,
): AnswerSpec | undefined {
  if (!dataset) return undefined;
  if (CHOICE_DATASETS.has(dataset)) {
    const count = question.multipleChoice?.choices.length ?? 4;
    return { kind: 'choice', choices: Array.from({ length: count }, (_, i) => toChoiceLetter(i)) };
  }
  switch (dataset) {
    case 'gsm8k':
      return { kind: 'numeric' };
    case 'math500':
      return { kind: 'math' };
    case 'hallumix':
      return { kind: 'yesno' };
    default:
      return { kind: 'text' };
  }
}

function prepareOne(
  dataset: BenchmarkDatasetName | null,
  question: BenchmarkQuestion,
  optionSeed: number | null,
): BenchmarkQuestion {
  const answer = answerSpecFor(dataset, question);
  const instruction = answer ? answerInstruction(answer) : '';
  const mc = question.multipleChoice;

  if (!mc) {
    return {
      ...question,
      prompt: instruction ? `${question.prompt}\n\n${instruction}` : question.prompt,
      ...(answer ? { answer } : {}),
    };
  }

  if (optionSeed === null) {
    return { ...question, prompt: buildChoicePrompt(mc, mc.choices, instruction), ...(answer ? { answer } : {}) };
  }

  const shuffled = shuffleChoices(mc.choices, mc.correctIndex, optionSeed, question.id);
  return {
    ...question,
    prompt: buildChoicePrompt(mc, shuffled.choices, instruction),
    groundTruth: toChoiceLetter(shuffled.correctIndex),
    optionPermutation: shuffled.permutation,
    optionSeed,
    ...(answer ? { answer } : {}),
  };
}

/**
 * Prepare loaded questions for a run. Legacy runs get the questions back
 * unchanged. Structured runs shuffle multiple-choice options (recording the
 * permutation and seed), replace the dataset's closing line with the
 * structured answer instruction, and set `answer`.
 */
export function prepareQuestions(
  dataset: BenchmarkDatasetName | null,
  questions: BenchmarkQuestion[],
  options: PrepareOptions,
): BenchmarkQuestion[] {
  if (options.protocol === 'legacy') return questions;
  const seed = options.optionSeed === undefined ? DEFAULT_OPTION_SEED : options.optionSeed;
  return questions.map((question) => prepareOne(dataset, question, seed));
}
