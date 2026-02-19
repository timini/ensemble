import { describe, expect, it, vi } from 'vitest';
import type { AIProvider } from '@ensemble-ai/shared-utils/providers';
import {
  createEvaluatorForDataset,
  GenerativeEvaluator,
  LLMJudgeMCQEvaluator,
  LLMJudgeNumericEvaluator,
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

  it('extracts "The correct answer is A"', () => {
    expect(extractChoiceLetter('The correct answer is A')).toBe('A');
  });

  it('extracts "The answer is (B)"', () => {
    expect(extractChoiceLetter('The answer is (B)')).toBe('B');
  });

  it('extracts "(A) is correct"', () => {
    expect(extractChoiceLetter('(A) is correct')).toBe('A');
  });

  it('extracts "Option C is correct"', () => {
    expect(extractChoiceLetter('Option C is correct')).toBe('C');
  });

  it('extracts "The correct answer is (D)"', () => {
    expect(extractChoiceLetter('The correct answer is (D)')).toBe('D');
  });

  it('extracts markdown bold **A**', () => {
    expect(extractChoiceLetter('The answer is **A**')).toBe('A');
  });

  it('extracts markdown underscore __D__', () => {
    expect(extractChoiceLetter('The answer is __D__')).toBe('D');
  });

  it('extracts "The correct option is A"', () => {
    expect(extractChoiceLetter('The correct option is A')).toBe('A');
  });

  it('extracts "The best answer is B"', () => {
    expect(extractChoiceLetter('The best answer is B')).toBe('B');
  });

  it('extracts "The best option is C"', () => {
    expect(extractChoiceLetter('The best option is C')).toBe('C');
  });

  it('extracts "A. Bananas are yellow" format', () => {
    expect(extractChoiceLetter('A. Bananas are yellow')).toBe('A');
  });

  it('extracts bare letter on last line', () => {
    expect(extractChoiceLetter('After analysis, I believe the answer is:\nB')).toBe('B');
  });

  it('extracts single bold letter **C**', () => {
    expect(extractChoiceLetter('**C**')).toBe('C');
  });

  it('extracts italic *A*', () => {
    expect(extractChoiceLetter('The answer is *A*')).toBe('A');
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

describe('LLMJudgeMCQEvaluator', () => {
  function createMockProvider(answer: string): AIProvider {
    return {
      generateStructured: vi.fn().mockResolvedValue({
        parsed: { answer },
        raw: JSON.stringify({ answer }),
        responseTimeMs: 50,
      }),
      streamResponse: vi.fn(),
      generateEmbeddings: vi.fn(),
      validateApiKey: vi.fn(),
      listAvailableModels: vi.fn().mockReturnValue([]),
      listAvailableTextModels: vi.fn().mockResolvedValue([]),
    } as unknown as AIProvider;
  }

  it('uses judge LLM to extract the answer', async () => {
    const provider = createMockProvider('B');
    const evaluator = new LLMJudgeMCQEvaluator(provider, 'gpt-4o-mini');

    const result = await evaluator.evaluate(
      'I think the answer is B because...',
      'B',
    );

    expect(result.correct).toBe(true);
    expect(result.predicted).toBe('B');
    expect(result.expected).toBe('B');
    expect(provider.generateStructured).toHaveBeenCalledWith(
      expect.stringContaining('I think the answer is B because...'),
      'gpt-4o-mini',
      expect.objectContaining({ name: 'mcq_answer' }),
      { temperature: 0 },
    );
  });

  it('marks incorrect when judge extracts wrong answer', async () => {
    const provider = createMockProvider('A');
    const evaluator = new LLMJudgeMCQEvaluator(provider, 'gpt-4o-mini');

    const result = await evaluator.evaluate('The answer is A', 'C');

    expect(result.correct).toBe(false);
    expect(result.predicted).toBe('A');
    expect(result.expected).toBe('C');
  });

  it('returns null predicted when judge call fails', async () => {
    const provider = {
      generateStructured: vi.fn().mockRejectedValue(new Error('API error')),
      streamResponse: vi.fn(),
      generateEmbeddings: vi.fn(),
      validateApiKey: vi.fn(),
      listAvailableModels: vi.fn().mockReturnValue([]),
      listAvailableTextModels: vi.fn().mockResolvedValue([]),
    } as unknown as AIProvider;

    const evaluator = new LLMJudgeMCQEvaluator(provider, 'gpt-4o-mini');
    const result = await evaluator.evaluate('Answer: D', 'D');

    expect(result.correct).toBe(false);
    expect(result.predicted).toBeNull();
  });

  it('has name "mcq" for compatibility with EvaluatorLike', () => {
    const provider = createMockProvider('A');
    const evaluator = new LLMJudgeMCQEvaluator(provider, 'gpt-4o-mini');
    expect(evaluator.name).toBe('mcq');
  });
});

describe('LLMJudgeNumericEvaluator', () => {
  function createMockProvider(answer: string): AIProvider {
    return {
      generateStructured: vi.fn().mockResolvedValue({
        parsed: { answer },
        raw: JSON.stringify({ answer }),
        responseTimeMs: 50,
      }),
      streamResponse: vi.fn(),
      generateEmbeddings: vi.fn(),
      validateApiKey: vi.fn(),
      listAvailableModels: vi.fn().mockReturnValue([]),
      listAvailableTextModels: vi.fn().mockResolvedValue([]),
    } as unknown as AIProvider;
  }

  it('uses judge LLM to extract the numeric answer', async () => {
    const provider = createMockProvider('42');
    const evaluator = new LLMJudgeNumericEvaluator(provider, 'gpt-4o-mini');

    const result = await evaluator.evaluate(
      'First I calculated 10 + 32 = 42. So the answer is 42.',
      '#### 42',
    );

    expect(result.correct).toBe(true);
    expect(result.predicted).toBe('42');
    expect(result.expected).toBe('42');
    expect(provider.generateStructured).toHaveBeenCalledWith(
      expect.stringContaining('First I calculated 10 + 32 = 42'),
      'gpt-4o-mini',
      expect.objectContaining({ name: 'numeric_answer' }),
      { temperature: 0 },
    );
  });

  it('marks incorrect when judge extracts wrong number', async () => {
    const provider = createMockProvider('10');
    const evaluator = new LLMJudgeNumericEvaluator(provider, 'gpt-4o-mini');

    const result = await evaluator.evaluate('The answer is 10', '#### 42');

    expect(result.correct).toBe(false);
    expect(result.predicted).toBe('10');
    expect(result.expected).toBe('42');
  });

  it('returns null predicted when judge call fails', async () => {
    const provider = {
      generateStructured: vi.fn().mockRejectedValue(new Error('API error')),
      streamResponse: vi.fn(),
      generateEmbeddings: vi.fn(),
      validateApiKey: vi.fn(),
      listAvailableModels: vi.fn().mockReturnValue([]),
      listAvailableTextModels: vi.fn().mockResolvedValue([]),
    } as unknown as AIProvider;

    const evaluator = new LLMJudgeNumericEvaluator(provider, 'gpt-4o-mini');
    const result = await evaluator.evaluate('The answer is 42', '#### 42');

    expect(result.correct).toBe(false);
    expect(result.predicted).toBeNull();
  });

  it('has name "numeric" for compatibility with EvaluatorLike', () => {
    const provider = createMockProvider('1');
    const evaluator = new LLMJudgeNumericEvaluator(provider, 'gpt-4o-mini');
    expect(evaluator.name).toBe('numeric');
  });
});

describe('createEvaluatorForDataset', () => {
  const mockProvider = {
    generateStructured: vi.fn(),
    streamResponse: vi.fn(),
    generateEmbeddings: vi.fn(),
    validateApiKey: vi.fn(),
    listAvailableModels: vi.fn().mockReturnValue([]),
    listAvailableTextModels: vi.fn().mockResolvedValue([]),
  } as unknown as AIProvider;
  const judge = { provider: mockProvider, model: 'gpt-4o-mini' };

  it('returns the expected evaluator types', () => {
    expect(createEvaluatorForDataset('gsm8k')?.name).toBe('numeric');
    expect(createEvaluatorForDataset('truthfulqa', judge)?.name).toBe('mcq');
    expect(createEvaluatorForDataset('gpqa', judge)?.name).toBe('mcq');
    expect(createEvaluatorForDataset(null)).toBeNull();
  });

  it('returns LLM judge evaluators when judge config is provided', () => {
    const truthful = createEvaluatorForDataset('truthfulqa', judge);
    const gpqa = createEvaluatorForDataset('gpqa', judge);
    const gsm8k = createEvaluatorForDataset('gsm8k', judge);

    expect(truthful).toBeInstanceOf(LLMJudgeMCQEvaluator);
    expect(gpqa).toBeInstanceOf(LLMJudgeMCQEvaluator);
    expect(gsm8k).toBeInstanceOf(LLMJudgeNumericEvaluator);
  });

  it('returns regex NumericEvaluator for gsm8k when no judge config', () => {
    const gsm8k = createEvaluatorForDataset('gsm8k');
    expect(gsm8k).toBeInstanceOf(NumericEvaluator);
  });

  it('throws when no judge config is provided for MCQ datasets', () => {
    expect(() => createEvaluatorForDataset('truthfulqa')).toThrow(
      'MCQ datasets require a judge config',
    );
    expect(() => createEvaluatorForDataset('gpqa')).toThrow(
      'MCQ datasets require a judge config',
    );
  });
});
