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

  it('keeps OpenAI output when reasoning is already inside completion_tokens', () => {
    expect(
      fromChatCompletionUsage({
        prompt_tokens: 10,
        completion_tokens: 50,
        total_tokens: 60,
        completion_tokens_details: { reasoning_tokens: 40 },
      }),
    ).toEqual({ inputTokens: 10, outputTokens: 50 });
  });

  it('counts xAI reasoning tokens, which completion_tokens leaves out, as output', () => {
    expect(
      fromChatCompletionUsage({
        prompt_tokens: 47,
        completion_tokens: 1,
        total_tokens: 245,
        completion_tokens_details: { reasoning_tokens: 197 },
      }),
    ).toEqual({ inputTokens: 47, outputTokens: 198 });
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
