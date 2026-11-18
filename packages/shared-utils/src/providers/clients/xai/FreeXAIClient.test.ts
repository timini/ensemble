import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreeXAIClient } from './FreeXAIClient.js';

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

// Shape of an xAI usage block for a reasoning model: reasoning tokens are
// outside completion_tokens but inside total_tokens.
const xaiUsage = {
  prompt_tokens: 47,
  completion_tokens: 1,
  total_tokens: 245,
  completion_tokens_details: { reasoning_tokens: 197 },
};

describe('FreeXAIClient token usage', () => {
  beforeEach(() => {
    mocks.chatCreate.mockReset();
  });

  it('counts reasoning tokens as output when streaming', async () => {
    mocks.chatCreate.mockResolvedValueOnce({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: '4' } }] };
        yield { choices: [], usage: xaiUsage };
      },
    });
    const client = new FreeXAIClient('xai', () => 'xai-test');
    const onComplete = vi.fn();
    await client.streamResponse('2+2?', 'grok-4.7', vi.fn(), onComplete, vi.fn());
    expect(onComplete).toHaveBeenCalledWith('4', expect.any(Number), 245, {
      inputTokens: 47,
      outputTokens: 198,
    });
  });

  it('counts reasoning tokens as output in structured output', async () => {
    mocks.chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"answer":"4"}' } }],
      usage: xaiUsage,
    });
    const client = new FreeXAIClient('xai', () => 'xai-test');
    const result = await client.generateStructured('2+2?', 'grok-4.7', schema);
    expect(result.usage).toEqual({ inputTokens: 47, outputTokens: 198 });
  });
});
