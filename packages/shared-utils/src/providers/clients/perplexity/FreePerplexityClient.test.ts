import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreePerplexityClient } from './FreePerplexityClient.js';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    openAiChatCreate: vi.fn(),
  },
}));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mocks.openAiChatCreate } };
  },
}));

describe('FreePerplexityClient', () => {
  beforeEach(() => {
    mocks.openAiChatCreate.mockReset();
  });

  describe('validateApiKey', () => {
    it('returns invalid for empty key', async () => {
      const client = new FreePerplexityClient('perplexity', () => null);
      const result = await client.validateApiKey('');
      expect(result).toEqual({ valid: false, error: 'API key is required.' });
    });

    it('returns valid when API call succeeds', async () => {
      mocks.openAiChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'hi' } }],
      });

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const result = await client.validateApiKey('pplx-test');
      expect(result).toEqual({ valid: true });
    });

    it('returns invalid on 401 error', async () => {
      mocks.openAiChatCreate.mockRejectedValueOnce(
        new Error('401 Unauthorized'),
      );

      const client = new FreePerplexityClient('perplexity', () => 'bad-key');
      const result = await client.validateApiKey('bad-key');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('401');
    });

    it('returns invalid with error message on other errors', async () => {
      mocks.openAiChatCreate.mockRejectedValueOnce(
        new Error('Network failure'),
      );

      const client = new FreePerplexityClient('perplexity', () => 'key');
      const result = await client.validateApiKey('key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network failure');
    });
  });

  describe('fetchTextModels', () => {
    it('returns static model list', async () => {
      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const models = await client.listAvailableTextModels();
      expect(models).toEqual(expect.arrayContaining(['sonar', 'sonar-pro']));
    });
  });

  describe('streamWithProvider', () => {
    it('streams response chunks', async () => {
      const chunks = [
        { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] },
        { choices: [{ delta: { content: ' world' }, finish_reason: null }] },
        { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { total_tokens: 10 } },
      ];

      mocks.openAiChatCreate.mockResolvedValueOnce({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      });

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await client.streamResponse('test prompt', 'sonar', onChunk, onComplete, onError);

      expect(onChunk).toHaveBeenCalledWith('Hello');
      expect(onChunk).toHaveBeenCalledWith(' world');
      expect(onComplete).toHaveBeenCalledWith('Hello world', expect.any(Number), 10);
      expect(onError).not.toHaveBeenCalled();
    });

    it('calls onError on API failure', async () => {
      mocks.openAiChatCreate.mockRejectedValueOnce(new Error('API down'));

      const client = new FreePerplexityClient('perplexity', () => 'pplx-test');
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await client.streamResponse('test', 'sonar', onChunk, onComplete, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toContain('Perplexity API error');
    });

    it('calls onError when no API key is set', async () => {
      const client = new FreePerplexityClient('perplexity', () => null);
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await client.streamResponse('test', 'sonar', onChunk, onComplete, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toContain('Missing API key');
    });
  });
});
