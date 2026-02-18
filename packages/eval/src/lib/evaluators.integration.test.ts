import { describe, it, expect } from 'vitest';
import { createProviderClient } from '@ensemble-ai/shared-utils/providers';
import { LLMJudgeMCQEvaluator } from './evaluators.js';

const openaiKey = process.env.OPENAI_API_KEY ?? process.env.TEST_OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY ?? process.env.TEST_ANTHROPIC_API_KEY;
const googleKey = process.env.GOOGLE_API_KEY ?? process.env.TEST_GOOGLE_API_KEY;

const describeIf = (condition: unknown) => (condition ? describe : describe.skip);

const TEST_CASES = [
  {
    description: 'clear single-letter answer',
    response: 'The answer is B.',
    expected: 'B',
  },
  {
    description: 'verbose reasoning then answer',
    response:
      "Let me think step by step. First, option A is wrong because... Option C doesn't apply. Therefore, the correct answer is D.",
    expected: 'D',
  },
  {
    description: 'answer embedded in explanation',
    response:
      'After careful analysis, I believe C is correct because it addresses the core issue.',
    expected: 'C',
  },
  {
    description: 'multiple letters mentioned, last is answer',
    response:
      'While A and B are tempting, the best answer is A because it directly solves the problem.',
    expected: 'A',
  },
  {
    description: 'markdown-formatted answer',
    response:
      '**Answer: D**\n\nThis is because option D provides the most comprehensive solution.',
    expected: 'D',
  },
];

describeIf(Boolean(openaiKey))('LLMJudgeMCQEvaluator – OpenAI integration', () => {
  const provider = createProviderClient({
    provider: 'openai',
    mode: 'free',
    getApiKey: () => openaiKey!,
  });
  const evaluator = new LLMJudgeMCQEvaluator(provider, 'gpt-4o-mini');

  it.each(TEST_CASES)(
    '$description',
    async ({ response, expected }) => {
      const result = await evaluator.evaluate(response, expected);
      expect(result.predicted).toBe(expected);
      expect(result.correct).toBe(true);
    },
    30_000,
  );
});

describeIf(Boolean(anthropicKey))('LLMJudgeMCQEvaluator – Anthropic integration', () => {
  const provider = createProviderClient({
    provider: 'anthropic',
    mode: 'free',
    getApiKey: () => anthropicKey!,
  });
  const evaluator = new LLMJudgeMCQEvaluator(provider, 'claude-3-haiku-20240307');

  it.each(TEST_CASES)(
    '$description',
    async ({ response, expected }) => {
      const result = await evaluator.evaluate(response, expected);
      expect(result.predicted).toBe(expected);
      expect(result.correct).toBe(true);
    },
    30_000,
  );
});

describeIf(Boolean(googleKey))('LLMJudgeMCQEvaluator – Google integration', () => {
  const provider = createProviderClient({
    provider: 'google',
    mode: 'free',
    getApiKey: () => googleKey!,
  });
  const evaluator = new LLMJudgeMCQEvaluator(provider, 'gemini-2.0-flash');

  it.each(TEST_CASES)(
    '$description',
    async ({ response, expected }) => {
      const result = await evaluator.evaluate(response, expected);
      expect(result.predicted).toBe(expected);
      expect(result.correct).toBe(true);
    },
    30_000,
  );
});
