import { describe, expect, it } from 'vitest';
import { fromChatCompletionUsage, fromGeminiUsage, fromResponsesUsage } from './usage';

describe('usage mappers', () => {
  it('maps chat completion usage', () => {
    expect(fromChatCompletionUsage({ prompt_tokens: 3, completion_tokens: 4 })).toEqual({
      inputTokens: 3,
      outputTokens: 4,
    });
    expect(fromChatCompletionUsage({ total_tokens: 7 })).toBeUndefined();
    expect(fromChatCompletionUsage(null)).toBeUndefined();
  });

  it('counts Gemini thinking tokens as output', () => {
    expect(
      fromGeminiUsage({ promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 20 }),
    ).toEqual({ inputTokens: 10, outputTokens: 25 });
    expect(fromGeminiUsage({ totalTokenCount: 9 })).toBeUndefined();
    expect(fromGeminiUsage(undefined)).toBeUndefined();
  });

  it('maps Responses-style usage and ignores all-zero usage', () => {
    expect(fromResponsesUsage({ input_tokens: 1, output_tokens: 2 })).toEqual({
      inputTokens: 1,
      outputTokens: 2,
    });
    expect(fromResponsesUsage({ input_tokens: 0, output_tokens: 0 })).toBeUndefined();
  });
});
