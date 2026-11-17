import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreeGoogleClient } from './FreeGoogleClient';

const { mocks } = vi.hoisted(() => ({
  mocks: { generateContent: vi.fn() },
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mocks.generateContent };
    }
  },
}));

const schema = {
  name: 'answer',
  schema: {
    type: 'object',
    properties: { answer: { type: 'string' } },
    required: ['answer'],
  },
};

describe('FreeGoogleClient structured usage', () => {
  beforeEach(() => {
    mocks.generateContent.mockReset();
  });

  it('reports input and output tokens, with thinking tokens as output', async () => {
    mocks.generateContent.mockResolvedValueOnce({
      response: {
        text: () => '{"answer":"4"}',
        usageMetadata: {
          promptTokenCount: 30,
          candidatesTokenCount: 5,
          thoughtsTokenCount: 40,
          totalTokenCount: 75,
        },
      },
    });
    const client = new FreeGoogleClient('google', () => 'g-test');
    const result = await client.generateStructured('2+2?', 'gemini-3-pro', schema);
    expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 45 });
    expect(result.tokenCount).toBe(75);
  });
});
