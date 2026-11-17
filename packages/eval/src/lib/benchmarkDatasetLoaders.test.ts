import { describe, expect, it } from 'vitest';
import {
  mapArcRow,
  mapGpqaRow,
  mapHellaSwagRow,
  mapMmluProRow,
  mapTruthfulQaRow,
} from './benchmarkDatasetLoaders.js';
import { prepareQuestions } from './methodology.js';

describe('multiple-choice loaders keep their options for shuffling', () => {
  it('TruthfulQA records the options and the correct index', () => {
    const q = mapTruthfulQaRow(
      { question: 'Q?', mc1_targets: { choices: ['right', 'wrong', 'also wrong'], labels: [1, 0, 0] } },
      3,
    );
    expect(q.groundTruth).toBe('A');
    expect(q.multipleChoice).toEqual({
      stem: 'Q?',
      choices: ['right', 'wrong', 'also wrong'],
      correctIndex: 0,
      style: 'dot',
      footer: 'Respond with the single best option letter.',
    });
  });

  it('MMLU-Pro uses answer_index', () => {
    const q = mapMmluProRow(
      {
        question_id: 1, question: 'Q?', options: ['a', 'b', 'c'], answer: 'C', answer_index: 2,
        category: 'law', src: 'x',
      },
      0,
    );
    expect(q.multipleChoice?.correctIndex).toBe(2);
    expect(q.multipleChoice?.choices).toEqual(['a', 'b', 'c']);
  });

  it('ARC maps numeric answer keys', () => {
    const q = mapArcRow(
      { id: 'x', question: 'Q?', choices: { label: ['1', '2', '3'], text: ['a', 'b', 'c'] }, answerKey: '2' },
      0,
    );
    expect(q.groundTruth).toBe('B');
    expect(q.multipleChoice?.correctIndex).toBe(1);
  });

  it('HellaSwag keeps its completion stem', () => {
    const q = mapHellaSwagRow({ ctx: 'A man', endings: ['x', 'y'], label: '1' }, 0);
    expect(q.multipleChoice?.stem).toBe('Complete the following:\n\nA man');
    expect(q.multipleChoice?.correctIndex).toBe(1);
  });

  it('GPQA parses the options out of the problem text', () => {
    const q = mapGpqaRow(
      {
        problem: 'Which?\n\n(A) one\n(B) two\n(C) three\n(D) four\n\nPlease write \\boxed{A}',
        solution: '\\boxed{C}',
        domain: 'Physics',
      },
      0,
    );
    expect(q.groundTruth).toBe('C');
    expect(q.multipleChoice).toEqual({
      stem: 'Which?',
      choices: ['one', 'two', 'three', 'four'],
      correctIndex: 2,
      style: 'paren',
      footer: 'Please write \\boxed{A}',
    });
  });

  it('GPQA without parsable options keeps its prompt and is not shuffled', () => {
    const q = mapGpqaRow({ problem: 'Free text question', solution: 'answer: B' }, 0);
    expect(q.multipleChoice).toBeUndefined();
    const [prepared] = prepareQuestions('gpqa', [q], { protocol: 'structured' });
    expect(prepared.groundTruth).toBe('B');
    expect(prepared.optionPermutation).toBeUndefined();
  });

  it('keeps legacy prompts unchanged so committed caches still match', () => {
    const q = mapTruthfulQaRow({ question: 'Q?', mc1_targets: { choices: ['r', 'w'], labels: [1, 0] } }, 0);
    expect(q.prompt).toBe('Q?\n\nOptions:\nA. r\nB. w\n\nRespond with the single best option letter.');
  });
});
