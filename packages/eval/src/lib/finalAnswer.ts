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

/**
 * Option letters named by the choice instruction in a structured prompt
 * (see answerInstruction), or undefined when the prompt has none.
 */
export function choicesFromPrompt(prompt: string | undefined): string[] | undefined {
  const match = prompt?.match(/the letter of the single best option \(([A-Z](?:, [A-Z])*(?: or [A-Z])?)\)/);
  if (!match) return undefined;
  return match[1].split(/, | or /);
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

/** A marked value that is just an option letter: "B", "(B)", "B.", "b)". */
const BARE_LETTER = /^\(?([A-Za-z])\)?[.):]?$/;
/** A marked value that starts with a labelled option letter: "(B) Paris", "B. Paris", "B) Paris". */
const LABELLED_LETTER = /^(?:\(([A-Za-z])\)|([A-Za-z])[.)])\s/;

function inRange(letter: string | null, spec: AnswerSpec): string | null {
  if (!letter) return null;
  const upper = letter.toUpperCase();
  if (spec.choices?.length && !spec.choices.includes(upper)) return null;
  return upper;
}

/**
 * Option letter from a short marked answer (the JSON field or the
 * "Final answer:" line). A leading one-letter word only counts when it is
 * the whole value or is labelled like an option, so "I think it is B" and
 * "A good choice is C" do not read as I or A.
 */
function choiceFromMarked(value: string, spec: AnswerSpec): string | null {
  const trimmed = value.trim();
  const bare = trimmed.match(BARE_LETTER);
  if (bare) return inRange(bare[1], spec);
  const labelled = trimmed.match(LABELLED_LETTER);
  if (labelled) return inRange(labelled[1] ?? labelled[2], spec);
  const parsed = inRange(extractChoiceLetter(trimmed), spec);
  if (parsed) return parsed;
  // Last standalone capital letter that is a valid option ("I think it is B").
  // A capital followed by a lower-case word is the article "A" or the pronoun "I".
  const capitals = [...trimmed.matchAll(/\b([A-Z])\b(?!\s+[a-z])/g)];
  return inRange(capitals.length > 0 ? capitals[capitals.length - 1][1] : null, spec);
}

/** Option letter from unmarked free text: only explicit patterns such as "answer is X" or "(X) is correct". */
function choiceFromText(text: string, spec: AnswerSpec): string | null {
  return inRange(extractChoiceLetter(text), spec);
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
      return marked ? choiceFromMarked(marked, spec) : choiceFromText(text, spec);
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

/** Replace each `\\name{...}` with its contents, allowing nested braces. */
function unwrapCommand(value: string, name: string): string {
  const open = `\\${name}{`;
  let result = value;
  for (let start = result.indexOf(open); start !== -1; start = result.indexOf(open)) {
    let depth = 0;
    let end = -1;
    for (let i = start + open.length - 1; i < result.length; i += 1) {
      if (result[i] === '{') depth += 1;
      else if (result[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(start + open.length, end) + result.slice(end + 1);
  }
  return result;
}

/** Normalise a LaTeX answer for string comparison. */
export function normalizeMath(value: string): string {
  let result = value.replace(/\\\$/g, '').replace(/\$/g, '');
  for (const name of ['boxed', 'text', 'textbf', 'mathrm', 'mbox']) result = unwrapCommand(result, name);
  return result
    .replace(/\\(?:left|right)\b/g, '')
    .replace(/\\[!,;: ]/g, '')
    .replace(/\\[dt]frac/g, '\\frac')
    // \frac12, \frac1{2} and \frac{1}2 all mean \frac{1}{2}.
    .replace(/\\frac\s*(\d)\s*(\d)/g, '\\frac{$1}{$2}')
    .replace(/\\frac\s*(\d)\s*\{/g, '\\frac{$1}{')
    .replace(/\\frac\{([^{}]*)\}\s*(\d)/g, '\\frac{$1}{$2}')
    .replace(/\\sqrt\s*(\d)/g, '\\sqrt{$1}')
    .replace(/\^\{?\\circ\}?/g, '')
    .replace(/\s+/g, '')
    .replace(/\.$/, '')
    // A single-variable assignment such as "x=3" or "k=\frac{1}{2}" is its value.
    .replace(/^[a-z]=(?!.*=)/i, '')
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
