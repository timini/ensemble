import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreeDeepSeekClient } from './FreeDeepSeekClient.js';

const { mocks } = vi.hoisted(() => ({
  mocks: { chatCreate: vi.fn() },
}));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mocks.chatCreate } };
  },
}));

const schema = {
  name: 'answer',
  schema: {
    type: 'object',
    properties: { answer: { type: 'string' } },
    required: ['answer'],
    additionalProperties: false,
  },
};

describe('FreeDeepSeekClient token usage', () => {
  beforeEach(() => {
    mocks.chatCreate.mockReset();
  });

  it('reports input and output tokens of a structured call', async () => {
    mocks.chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"answer":"4"}' } }],
      usage: { prompt_tokens: 15, completion_tokens: 9, total_tokens: 24 },
    });
    const client = new FreeDeepSeekClient('deepseek', () => 'sk-test');
    const result = await client.generateStructured('2+2?', 'deepseek-v4-pro', schema);
    expect(result.usage).toEqual({ inputTokens: 15, outputTokens: 9 });
    expect(result.tokenCount).toBe(24);
  });
});
