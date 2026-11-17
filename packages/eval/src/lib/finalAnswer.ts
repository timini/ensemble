/**
 * Structured final answers.
 *
 * Every generator is asked for a final answer in a fixed shape: a JSON
 * object `{ reasoning, answer }` through strict JSON schema where the
 * provider supports it, or a closing `Final answer: <answer>` line. The
 * answer is then read mechanically, so most datasets need no LLM judge.
 */
import type { JsonSchema } from '@ensemble-ai/shared-utils/providers';
import { extractChoiceLetter, extractNumericAnswer } from './parsers.js';

/**
 * What kind of answer a question expects:
 * - `choice`: one option letter from `choices`
 * - `numeric`: a number (GSM8K)
 * - `math`: a LaTeX expression (MATH-500)
 * - `yesno`: yes or no (HalluMix)
 * - `text`: a short free-text answer, which still needs a judge (SimpleQA, HLE)
 */
export type AnswerKind = 'choice' | 'numeric' | 'math' | 'yesno' | 'text';

export interface AnswerSpec {
  kind: AnswerKind;
  /** Option letters for `choice`, in display order. */
  choices?: string[];
}

/** Kinds that can be scored without an LLM judge. */
export function isMechanical(spec: AnswerSpec): boolean {
  return spec.kind !== 'text';
}

/** JSON schema for the final answer. Choice and yes/no answers are limited to their values. */
export function answerSchema(spec: AnswerSpec): JsonSchema {
  const answer: Record<string, unknown> = { type: 'string' };
  if (spec.kind === 'choice' && spec.choices?.length) answer.enum = [...spec.choices];
  if (spec.kind === 'yesno') answer.enum = ['yes', 'no'];
  return {
    name: 'final_answer',
    schema: {
      type: 'object',
      properties: { reasoning: { type: 'string' }, answer },
      required: ['reasoning', 'answer'],
      additionalProperties: false,
    },
  };
}

function listLetters(letters: string[]): string {
  if (letters.length <= 1) return letters.join('');
  return `${letters.slice(0, -1).join(', ')} or ${letters[letters.length - 1]}`;
}

function answerDescription(spec: AnswerSpec): string {
  switch (spec.kind) {
    case 'choice':
      return `the letter of the single best option (${listLetters(spec.choices ?? [])})`;
    case 'numeric':
      return 'the number only, with no units';
    case 'math':
      return 'the final expression only, in LaTeX without surrounding text';
    case 'yesno':
      return 'yes or no';
    case 'text':
      return 'a short answer, with no explanation';
  }
}

/** Instruction appended to every prompt in a structured run. */
export function answerInstruction(spec: AnswerSpec): string {
  return (
    'Work through the question, then give your final answer as ' +
    `${answerDescription(spec)}. If you reply in JSON, put your working in "reasoning" and the final ` +
    'answer in "answer". Otherwise end your reply with one line of the form "Final answer: <answer>".'
  );
}

/** Text stored for a structured reply, so consensus strategies and extraction read the same thing. */
export function formatStructuredContent(reasoning: string, answer: string): string {
  const trimmed = reasoning.trim();
  return trimmed ? `${trimmed}\n\nFinal answer: ${answer}` : `Final answer: ${answer}`;
}

function lastMatch(text: string, pattern: RegExp): RegExpMatchArray | null {
  let last: RegExpMatchArray | null = null;
  for (const match of text.matchAll(pattern)) last = match;
  return last;
}

/** The `answer` value of the last JSON object in the text that has one. */
function jsonAnswer(text: string): string | null {
  const match = lastMatch(text, /"answer"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d[\d.,]*)/g);
  if (!match) return null;
  try {
    const value: unknown = JSON.parse(match[1].replaceAll(',', ''));
    return String(value).trim() || null;
  } catch {
    return null;
  }
}

/** The text after the last "Final answer:" marker, on the same line. */
function finalAnswerLine(text: string): string | null {
  const match = lastMatch(text, /final\s+answer\s*\**\s*[:：]\s*\**\s*([^\n]+)/gi);
  if (!match) return null;
  const value = match[1].replace(/\*+/g, '').trim().replace(/[.。]$/, '').trim();
  return value || null;
}

/** Contents of the last `\boxed{...}`, with nested braces. */
function lastBoxed(text: string): string | null {
  const start = text.lastIndexOf('\\boxed{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start + '\\boxed'.length; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start + '\\boxed{'.length, i).trim();
    }
  }
  return null;
}

function toChoice(value: string | null, spec: AnswerSpec): string | null {
  if (!value) return null;
  const direct = value.trim().match(/^\(?([A-Za-z])\)?(?:[.):\s]|$)/);
  const letter = (direct?.[1] ?? extractChoiceLetter(value))?.toUpperCase() ?? null;
  if (!letter) return null;
  if (spec.choices?.length && !spec.choices.includes(letter)) return null;
  return letter;
}

function toYesNo(value: string | null): string | null {
  const match = value?.toLowerCase().match(/\b(yes|no)\b/);
  return match ? match[1] : null;
}

/**
 * Read the final answer from a reply: the JSON `answer` field, then a
 * `Final answer:` line, then the dataset's free-text parser. Returns the
 * answer normalised for its kind (upper-case letter, plain number, yes/no),
 * or null when none can be read.
 */
export function extractFinalAnswer(text: string, spec: AnswerSpec): string | null {
  if (!text.trim()) return null;
  const marked = jsonAnswer(text) ?? finalAnswerLine(text);

  switch (spec.kind) {
    case 'choice':
      return toChoice(marked, spec) ?? (marked ? null : toChoice(text, spec));
    case 'numeric':
      return (marked ? extractNumericAnswer(marked) : null) ?? extractNumericAnswer(text);
    case 'yesno':
      return toYesNo(marked) ?? toYesNo(text);
    case 'math':
      return marked ?? lastBoxed(text);
    case 'text':
      return marked ?? text.trim();
  }
}

function toNumber(value: string): number | null {
  const cleaned = value.replaceAll(',', '').trim();
  if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return Number(cleaned);
  const frac = cleaned.match(/^([-+]?)\\frac\{([-+]?\d+(?:\.\d+)?)\}\{([-+]?\d+(?:\.\d+)?)\}$/);
  if (frac) return (frac[1] === '-' ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
  const slash = cleaned.match(/^([-+]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (slash) return Number(slash[1]) / Number(slash[2]);
  return null;
}

/** Normalise a LaTeX answer for string comparison. */
export function normalizeMath(value: string): string {
  return value
    .replace(/\$/g, '')
    .replace(/\\(?:left|right)\b/g, '')
    .replace(/\\[!,;: ]/g, '')
    .replace(/\\[dt]frac/g, '\\frac')
    .replace(/\^\{?\\circ\}?/g, '')
    .replace(/\\text\{\s*([^}]*)\}/g, '$1')
    .replace(/\s+/g, '')
    .replace(/\.$/, '')
    .toLowerCase();
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

/** True when an extracted answer matches the expected one for its kind. */
export function answersMatch(predicted: string | null, expected: string, spec: AnswerSpec): boolean {
  if (predicted === null || !expected.trim()) return false;
  switch (spec.kind) {
    case 'choice':
      return predicted.trim().toUpperCase() === expected.trim().toUpperCase();
    case 'numeric': {
      const a = toNumber(predicted);
      const b = toNumber(expected);
      return a !== null && b !== null && Math.abs(a - b) < 1e-9;
    }
    case 'yesno':
      return predicted.trim().toLowerCase() === expected.trim().toLowerCase();
    case 'math': {
      const a = normalizeMath(predicted);
      const b = normalizeMath(expected);
      if (a === b) return true;
      const na = toNumber(a);
      const nb = toNumber(b);
      return na !== null && nb !== null && Math.abs(na - nb) < 1e-9;
    }
    case 'text':
      return normalizeText(predicted) === normalizeText(expected);
  }
}
