import { describe, expect, it } from 'vitest';
import {
  answerInstruction,
  answerSchema,
  answersMatch,
  choicesFromPrompt,
  extractFinalAnswer,
  formatStructuredContent,
  type AnswerSpec,
} from './finalAnswer.js';

const choice4: AnswerSpec = { kind: 'choice', choices: ['A', 'B', 'C', 'D'] };

describe('answerSchema', () => {
  it('limits choice answers to the option letters', () => {
    const schema = answerSchema(choice4);
    expect(schema.name).toBe('final_answer');
    const props = (schema.schema as { properties: Record<string, { enum?: string[] }> }).properties;
    expect(props.answer.enum).toEqual(['A', 'B', 'C', 'D']);
    expect(Object.keys(props)).toEqual(['reasoning', 'answer']);
  });

  it('uses yes and no for yes/no answers and free strings otherwise', () => {
    const yesno = answerSchema({ kind: 'yesno' }).schema as { properties: Record<string, { enum?: string[] }> };
    expect(yesno.properties.answer.enum).toEqual(['yes', 'no']);
    const numeric = answerSchema({ kind: 'numeric' }).schema as { properties: Record<string, { enum?: string[] }> };
    expect(numeric.properties.answer.enum).toBeUndefined();
  });
});

describe('answerInstruction', () => {
  it('asks for a Final answer line naming the letters', () => {
    const text = answerInstruction(choice4);
    expect(text).toMatch(/Final answer:/);
    expect(text).toMatch(/A, B, C or D/);
  });
});

describe('choicesFromPrompt', () => {
  it('reads the option letters back from the answer instruction', () => {
    expect(choicesFromPrompt(`Question?\n\n${answerInstruction(choice4)}`)).toEqual(['A', 'B', 'C', 'D']);
    expect(choicesFromPrompt(answerInstruction({ kind: 'choice', choices: ['A', 'B'] }))).toEqual(['A', 'B']);
    expect(choicesFromPrompt('Question with no instruction')).toBeUndefined();
    expect(choicesFromPrompt(undefined)).toBeUndefined();
  });
});

describe('extractFinalAnswer', () => {
  it('reads the answer field of a JSON object', () => {
    expect(extractFinalAnswer('{"reasoning":"x","answer":"C"}', choice4)).toBe('C');
    expect(extractFinalAnswer('Sure.\n```json\n{"answer": "b"}\n```', choice4)).toBe('B');
  });

  it('reads the last Final answer line', () => {
    expect(extractFinalAnswer('Final answer: A\nWait, no.\nFinal answer: (D)', choice4)).toBe('D');
    expect(extractFinalAnswer('So 3+4.\n\n**Final answer:** 1,234', { kind: 'numeric' })).toBe('1234');
    expect(extractFinalAnswer('Final Answer: Yes.', { kind: 'yesno' })).toBe('yes');
  });

  it('round-trips formatStructuredContent', () => {
    const content = formatStructuredContent('Because.', 'B');
    expect(content).toBe('Because.\n\nFinal answer: B');
    expect(extractFinalAnswer(content, choice4)).toBe('B');
  });

  it('falls back to the dataset parser on free text', () => {
    expect(extractFinalAnswer('The answer is (B).', choice4)).toBe('B');
    expect(extractFinalAnswer('She has 18 apples in total, so 18.', { kind: 'numeric' })).toBe('18');
    expect(extractFinalAnswer('No, this is not supported.', { kind: 'yesno' })).toBe('no');
  });

  it('rejects letters outside the options', () => {
    expect(extractFinalAnswer('Final answer: F', choice4)).toBeNull();
  });

  it('does not read a leading article or pronoun as an option', () => {
    const choice10: AnswerSpec = { kind: 'choice', choices: 'ABCDEFGHIJ'.split('') };
    expect(extractFinalAnswer('A careful reading shows the answer is D', choice4)).toBe('D');
    expect(extractFinalAnswer('A careful reading shows nothing useful.', choice4)).toBeNull();
    expect(extractFinalAnswer('I think so.', choice10)).toBeNull();
    expect(extractFinalAnswer('Final answer: I think it is B', choice10)).toBe('B');
    expect(extractFinalAnswer('Final answer: A good choice is C', choice4)).toBe('C');
    expect(extractFinalAnswer('Final answer: (B) Paris', choice4)).toBe('B');
    expect(extractFinalAnswer('Final answer: B. Paris', choice4)).toBe('B');
    expect(extractFinalAnswer('{"answer":"I"}', choice10)).toBe('I');
  });

  it('returns null when nothing can be read', () => {
    expect(extractFinalAnswer('', choice4)).toBeNull();
    expect(extractFinalAnswer('I am not sure.', { kind: 'numeric' })).toBeNull();
  });

  it('keeps math expressions whole', () => {
    expect(extractFinalAnswer('Final answer: $\\frac{14}{3}$', { kind: 'math' })).toBe('$\\frac{14}{3}$');
    expect(extractFinalAnswer('so \\boxed{\\frac{1}{2}} is it', { kind: 'math' })).toBe('\\frac{1}{2}');
  });
});

describe('answersMatch', () => {
  it('compares letters, numbers, yes/no and math', () => {
    expect(answersMatch('b', 'B', choice4)).toBe(true);
    expect(answersMatch('18.0', '18', { kind: 'numeric' })).toBe(true);
    expect(answersMatch('17', '18', { kind: 'numeric' })).toBe(false);
    expect(answersMatch('Yes', 'yes', { kind: 'yesno' })).toBe(true);
    expect(answersMatch('$\\dfrac{14}{3}$', '\\frac{14}{3}', { kind: 'math' })).toBe(true);
    expect(answersMatch('\\left( 3, \\frac{\\pi}{2} \\right)', '(3,\\frac{\\pi}{2})', { kind: 'math' })).toBe(true);
    expect(answersMatch('0.5', '\\frac{1}{2}', { kind: 'math' })).toBe(true);
    expect(answersMatch('10^\\circ', '10', { kind: 'math' })).toBe(true);
    expect(answersMatch('x+1', 'x+2', { kind: 'math' })).toBe(false);
    expect(answersMatch(null, 'A', choice4)).toBe(false);
  });

  it('normalises boxed answers, assignments, brace-less fractions and escaped dollars', () => {
    const math: AnswerSpec = { kind: 'math' };
    expect(answersMatch('\\boxed{65}', '65', math)).toBe(true);
    expect(answersMatch('\\boxed{\\frac{1}{2}}', '\\frac12', math)).toBe(true);
    expect(answersMatch('x = 3', '3', math)).toBe(true);
    expect(answersMatch('k=\\frac{1}{2}', '\\frac{1}{2}', math)).toBe(true);
    expect(answersMatch('\\frac12', '\\frac{1}{2}', math)).toBe(true);
    expect(answersMatch('\\frac1{2}', '\\frac{1}{2}', math)).toBe(true);
    expect(answersMatch('\\frac{3}4', '\\frac{3}{4}', math)).toBe(true);
    expect(answersMatch('\\$5', '5', math)).toBe(true);
    expect(answersMatch('\\text{(C)}', '(C)', math)).toBe(true);
    expect(answersMatch('\\sqrt2', '\\sqrt{2}', math)).toBe(true);
    expect(answersMatch('x = 4', '3', math)).toBe(false);
    expect(answersMatch('\\frac12', '\\frac{1}{3}', math)).toBe(false);
  });

  it('compares text case- and punctuation-insensitively', () => {
    expect(answersMatch('Paris.', 'paris', { kind: 'text' })).toBe(true);
  });
});
