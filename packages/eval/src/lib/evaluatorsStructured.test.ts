import { describe, expect, it } from 'vitest';
import type { AIProvider } from '@ensemble-ai/shared-utils/providers';
import { answerInstruction } from './finalAnswer.js';
import {
  LLMJudgeExactMatchEvaluator,
  LLMJudgeNumericEvaluator,
  MechanicalEvaluator,
  assertIndependentJudge,
  createEvaluatorForDataset,
  datasetNeedsJudge,
} from './evaluators.js';
import { parseModelSpec } from './modelSpecs.js';

const judge = { provider: {} as AIProvider, model: 'judge' };

describe('structured protocol evaluators', () => {
  it('scores choice, numeric, math and yes/no datasets mechanically with no judge', () => {
    for (const name of ['truthfulqa', 'gpqa', 'mmlu_pro', 'arc', 'hellaswag', 'gsm8k', 'math500', 'hallumix'] as const) {
      const evaluator = createEvaluatorForDataset(name, undefined, { protocol: 'structured' });
      expect(evaluator).toBeInstanceOf(MechanicalEvaluator);
      expect(datasetNeedsJudge(name, 'structured')).toBe(false);
    }
  });

  it('still needs a judge for free-text datasets', () => {
    expect(datasetNeedsJudge('simpleqa', 'structured')).toBe(true);
    expect(datasetNeedsJudge('hle', 'structured')).toBe(true);
    expect(() => createEvaluatorForDataset('simpleqa', undefined, { protocol: 'structured' })).toThrow(/judge/);
    expect(createEvaluatorForDataset('hle', judge, { protocol: 'structured' })).toBeInstanceOf(
      LLMJudgeExactMatchEvaluator,
    );
  });

  it('legacy datasets keep the LLM judge', () => {
    expect(datasetNeedsJudge('truthfulqa', 'legacy')).toBe(true);
    expect(createEvaluatorForDataset('truthfulqa', judge)).not.toBeInstanceOf(MechanicalEvaluator);
  });

  it('legacy GSM8K and MATH-500 keep the LLM judge, as the committed caches were scored', () => {
    for (const name of ['gsm8k', 'math500'] as const) {
      expect(datasetNeedsJudge(name, 'legacy')).toBe(true);
      expect(createEvaluatorForDataset(name, judge, { protocol: 'legacy' })).toBeInstanceOf(LLMJudgeNumericEvaluator);
    }
  });
});

describe('MechanicalEvaluator', () => {
  it('reads the final answer and compares it', () => {
    const mcq = new MechanicalEvaluator('choice');
    expect(mcq.name).toBe('mcq');
    expect(mcq.evaluate('Because.\n\nFinal answer: c', 'C')).toEqual({ correct: true, expected: 'C', predicted: 'C' });
    expect(mcq.evaluate('Final answer: B', 'C').correct).toBe(false);

    const numeric = new MechanicalEvaluator('numeric');
    expect(numeric.name).toBe('numeric');
    expect(numeric.evaluate('{"reasoning":"...","answer":"1,000"}', '1000').correct).toBe(true);

    const math = new MechanicalEvaluator('math');
    expect(math.evaluate('Final answer: \\dfrac{3}{8}', '\\frac{3}{8}').correct).toBe(true);

    const yesno = new MechanicalEvaluator('yesno');
    expect(yesno.evaluate('Final answer: no', 'no').correct).toBe(true);
  });

  it('rejects letters outside the options named in the prompt', () => {
    const mcq = new MechanicalEvaluator('choice');
    const prompt = `Q\n\n${answerInstruction({ kind: 'choice', choices: ['A', 'B', 'C', 'D'] })}`;
    expect(mcq.evaluate('Final answer: F', 'F', prompt).correct).toBe(false);
    expect(mcq.evaluate('Final answer: D', 'D', prompt).correct).toBe(true);
    expect(mcq.evaluate('A careful reading shows the answer is D', 'A', prompt).correct).toBe(false);
  });

  it('marks unreadable answers wrong with no prediction', () => {
    expect(new MechanicalEvaluator('choice').evaluate('', 'A')).toEqual({
      correct: false,
      expected: 'A',
      predicted: null,
    });
  });
});

describe('assertIndependentJudge', () => {
  const generators = [parseModelSpec('ollama:qwen3:8b'), parseModelSpec('openai:gpt-4o')];

  it('refuses a judge that is also a generator', () => {
    expect(() => assertIndependentJudge(parseModelSpec('openai:gpt-4o'), generators)).toThrow(
      /also generates answers/,
    );
  });

  it('allows the same model when forced', () => {
    expect(() =>
      assertIndependentJudge(parseModelSpec('openai:gpt-4o'), generators, { allowSameModel: true }),
    ).not.toThrow();
  });

  it('allows a different model', () => {
    expect(() => assertIndependentJudge(parseModelSpec('google:gemini-2.5-flash'), generators)).not.toThrow();
  });
});
