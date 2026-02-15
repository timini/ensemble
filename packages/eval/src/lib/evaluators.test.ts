import { describe, expect, it, vi } from 'vitest';
import {
  createEvaluatorForDataset,
  GenerativeEvaluator,
  MCQEvaluator,
  NumericEvaluator,
} from './evaluators.js';
import { extractChoiceLetter, extractNumericAnswer } from './parsers.js';

describe('extractNumericAnswer', () => {
  it('extracts answer after GSM8K marker', () => {
    expect(extractNumericAnswer('work...\n#### 18')).toBe('18');
  });

  it('falls back to the final numeric token', () => {
    expect(extractNumericAnswer('First 7, then 10, final 42')).toBe('42');
  });

  it('ignores trailing confidence percentages in responses', () => {
    expect(
      extractNumericAnswer("Step by step: 5 + 3 = 8. I'm 95% confident."),
    ).toBe('8');
  });
});

describe('extractChoiceLetter', () => {
  it('extracts boxed answers', () => {
    expect(extractChoiceLetter('Final answer: \\boxed{D}')).toBe('D');
  });

  it('extracts labeled answers', () => {
    expect(extractChoiceLetter('Answer: b')).toBe('B');
  });

  it('avoids single-letter false positives in free-form text', () => {
    expect(extractChoiceLetter('I think the answer is clearly correct.')).toBeNull();
  });

  it('extracts selected choices from natural phrasing', () => {
    expect(extractChoiceLetter('I choose option d.')).toBe('D');
  });
});

describe('NumericEvaluator', () => {
  it('marks matching numeric answers as correct', () => {
    const evaluator = new NumericEvaluator();
    const result = evaluator.evaluate('The answer is 18.', '#### 18');

    expect(result.correct).toBe(true);
    expect(result.predicted).toBe('18');
    expect(result.expected).toBe('18');
  });

  it('marks non-matching numeric answers as incorrect', () => {
    const evaluator = new NumericEvaluator();
    const result = evaluator.evaluate('I got 19', '#### 18');

    expect(result.correct).toBe(false);
    expect(result.predicted).toBe('19');
    expect(result.expected).toBe('18');
  });
});

describe('MCQEvaluator', () => {
  it('marks matching choice answers as correct', () => {
    const evaluator = new MCQEvaluator();
    const result = evaluator.evaluate('Final answer: \\boxed{C}', 'C');

    expect(result.correct).toBe(true);
    expect(result.predicted).toBe('C');
    expect(result.expected).toBe('C');
  });

  it('marks non-matching choice answers as incorrect', () => {
    const evaluator = new MCQEvaluator();
    const result = evaluator.evaluate('Answer: A', 'D');

    expect(result.correct).toBe(false);
    expect(result.predicted).toBe('A');
    expect(result.expected).toBe('D');
  });
});

describe('GenerativeEvaluator', () => {
  it('delegates correctness to the judge function', async () => {
    const judge = vi.fn().mockResolvedValue(true);
    const evaluator = new GenerativeEvaluator(judge);

    const result = await evaluator.evaluate('model output', 'expected', 'prompt');

    expect(result.correct).toBe(true);
    expect(result.predicted).toBe('model output');
    expect(result.expected).toBe('expected');
    expect(judge).toHaveBeenCalledWith({
      prompt: 'prompt',
      response: 'model output',
      groundTruth: 'expected',
    });
  });
});

describe('createEvaluatorForDataset', () => {
  it('returns the expected evaluator types', () => {
    expect(createEvaluatorForDataset('gsm8k')?.name).toBe('numeric');
    expect(createEvaluatorForDataset('truthfulqa')?.name).toBe('mcq');
    expect(createEvaluatorForDataset('gpqa')?.name).toBe('mcq');
    expect(createEvaluatorForDataset(null)).toBeNull();
  });
});
