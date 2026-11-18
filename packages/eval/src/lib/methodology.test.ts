import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPTION_SEED,
  answerSpecFor,
  buildChoicePrompt,
  parseParenChoices,
  prepareQuestions,
  shuffleChoices,
} from './methodology.js';
import type { BenchmarkQuestion } from '../types.js';

function truthfulQuestion(id: string): BenchmarkQuestion {
  const choices = ['Right', 'Wrong 1', 'Wrong 2', 'Wrong 3', 'Wrong 4'];
  return {
    id,
    prompt: 'legacy prompt',
    groundTruth: 'A',
    multipleChoice: { stem: `Question ${id}?`, choices, correctIndex: 0, style: 'dot' },
  };
}

describe('shuffleChoices', () => {
  it('is deterministic for the same seed and question id', () => {
    const a = shuffleChoices(['w', 'x', 'y', 'z'], 2, 7, 'q1');
    const b = shuffleChoices(['w', 'x', 'y', 'z'], 2, 7, 'q1');
    expect(a).toEqual(b);
  });

  it('records a permutation that maps displayed options back to the originals', () => {
    const original = ['w', 'x', 'y', 'z'];
    const result = shuffleChoices(original, 2, 7, 'q1');
    expect([...result.permutation].sort()).toEqual([0, 1, 2, 3]);
    result.choices.forEach((choice, i) => expect(choice).toBe(original[result.permutation[i]]));
    expect(result.choices[result.correctIndex]).toBe('y');
  });

  it('gives different orders for different question ids', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, i) => shuffleChoices(['a', 'b', 'c', 'd'], 0, 7, `q${i}`).permutation.join('')),
    );
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe('prepareQuestions', () => {
  it('moves the TruthfulQA answer away from A across a sample', () => {
    const questions = Array.from({ length: 200 }, (_, i) => truthfulQuestion(`truthfulqa-${i}`));
    const prepared = prepareQuestions('truthfulqa', questions, { protocol: 'structured' });
    const counts: Record<string, number> = {};
    for (const q of prepared) counts[q.groundTruth] = (counts[q.groundTruth] ?? 0) + 1;
    expect(counts.A).toBeLessThan(70);
    expect(Object.keys(counts).sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
    for (const q of prepared) {
      const display = q.optionPermutation!;
      expect(q.optionSeed).toBe(DEFAULT_OPTION_SEED);
      expect(display[q.groundTruth.charCodeAt(0) - 65]).toBe(0);
      expect(q.prompt).toContain(`${q.groundTruth}. Right`);
      expect(q.prompt).toMatch(/Final answer:/);
      expect(q.prompt).not.toMatch(/Respond with the single best option letter/);
      expect(q.answer).toEqual({ kind: 'choice', choices: ['A', 'B', 'C', 'D', 'E'] });
    }
  });

  it('gives the same order on every run', () => {
    const one = prepareQuestions('truthfulqa', [truthfulQuestion('t-1')], { protocol: 'structured' });
    const two = prepareQuestions('truthfulqa', [truthfulQuestion('t-1')], { protocol: 'structured' });
    expect(one).toEqual(two);
  });

  it('leaves legacy questions untouched', () => {
    const q = truthfulQuestion('t-1');
    expect(prepareQuestions('truthfulqa', [q], { protocol: 'legacy' })).toEqual([q]);
  });

  it('can switch shuffling off', () => {
    const [q] = prepareQuestions('truthfulqa', [truthfulQuestion('t-1')], {
      protocol: 'structured',
      optionSeed: null,
    });
    expect(q.groundTruth).toBe('A');
    expect(q.optionPermutation).toBeUndefined();
  });

  it('appends the answer instruction to non-choice questions', () => {
    const [q] = prepareQuestions(
      'gsm8k',
      [{ id: 'g-1', prompt: 'What is 2+2?', groundTruth: '4' }],
      { protocol: 'structured' },
    );
    expect(q.prompt.startsWith('What is 2+2?\n\n')).toBe(true);
    expect(q.prompt).toMatch(/Final answer:/);
    expect(q.answer).toEqual({ kind: 'numeric' });
  });
});

describe('parseParenChoices', () => {
  it('splits a GPQA problem into stem, options and footer', () => {
    const parsed = parseParenChoices(
      'Which one?\n\n(A) first\n(B) second\nline two\n(C) third\n(D) fourth\n\nPlease write \\boxed{A}',
    );
    expect(parsed).toEqual({
      stem: 'Which one?',
      choices: ['first', 'second\nline two', 'third', 'fourth'],
      footer: 'Please write \\boxed{A}',
    });
  });

  it('returns null when options are missing or out of order', () => {
    expect(parseParenChoices('No options here')).toBeNull();
    expect(parseParenChoices('Q\n(A) a\n(C) c')).toBeNull();
  });
});

describe('buildChoicePrompt', () => {
  it('writes dot and paren styles', () => {
    expect(buildChoicePrompt({ stem: 'Q?', choices: [], correctIndex: 0, style: 'dot' }, ['x', 'y'], 'Go.')).toBe(
      'Q?\n\nOptions:\nA. x\nB. y\n\nGo.',
    );
    expect(buildChoicePrompt({ stem: 'Q?', choices: [], correctIndex: 0, style: 'paren' }, ['x', 'y'], 'Go.')).toBe(
      'Q?\n\n(A) x\n(B) y\n\nGo.',
    );
  });
});

describe('answerSpecFor', () => {
  it('maps each dataset to an answer kind', () => {
    expect(answerSpecFor('gsm8k', { id: 'x', prompt: '', groundTruth: '1' })).toEqual({ kind: 'numeric' });
    expect(answerSpecFor('math500', { id: 'x', prompt: '', groundTruth: '1' })).toEqual({ kind: 'math' });
    expect(answerSpecFor('hallumix', { id: 'x', prompt: '', groundTruth: 'yes' })).toEqual({ kind: 'yesno' });
    expect(answerSpecFor('simpleqa', { id: 'x', prompt: '', groundTruth: 'a' })).toEqual({ kind: 'text' });
    expect(answerSpecFor('hle', { id: 'x', prompt: '', groundTruth: 'a' })).toEqual({ kind: 'text' });
    expect(answerSpecFor(null, { id: 'x', prompt: '', groundTruth: 'a' })).toBeUndefined();
  });
});
