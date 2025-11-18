import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FreeOpenAIClient } from '../clients/openai/FreeOpenAIClient.js';
import { FreeXAIClient } from '../clients/xai/FreeXAIClient.js';
import { MockProviderClient } from '../clients/mock/MockProviderClient.js';
import { FreeAnthropicClient } from '../clients/anthropic/FreeAnthropicClient.js';
import { FreeGoogleClient } from '../clients/google/FreeGoogleClient.js';
import { BaseFreeClient } from '../clients/base/BaseFreeClient.js';

const mocks = vi.hoisted(() => ({
  openAiRetrieve: vi.fn(),
  openAiList: vi.fn(),
  openAiChatCreate: vi.fn(),
  axiosGet: vi.fn(),
}));

const createAsyncStream = (events: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const event of events) {
      yield event;
    }
  },
});

vi.mock('openai', () => ({
  default: class {
    models = { retrieve: mocks.openAiRetrieve, list: mocks.openAiList };
    chat = {
      completions: {
        create: mocks.openAiChatCreate,
      },
    };
  },
}));

vi.mock('axios', () => {
  const isAxiosError = (error: unknown): error is { isAxiosError: boolean; response?: { data?: { error?: { message?: string }; message?: string } } } =>
    typeof error === 'object' && error !== null && (error as { isAxiosError?: boolean }).isAxiosError === true;

  return {
    default: {
      get: mocks.axiosGet,
      isAxiosError,
    },
    get: mocks.axiosGet,
    isAxiosError,
  };
});

class TestFreeClient extends BaseFreeClient {
  constructor(
    getApiKey: () => string | null,
    private readonly shouldThrow = false,
  ) {
    super('openai', getApiKey);
  }

  async validateApiKey() {
    return { valid: true };
  }

  protected override async fetchTextModels(): Promise<string[]> {
    if (this.shouldThrow) {
      throw new Error('boom');
    }
    return ['custom-model'];
  }
}

describe('Free mode provider clients', () => {
  beforeEach(() => {
    mocks.openAiRetrieve.mockReset();
    mocks.openAiList.mockReset();
    mocks.openAiChatCreate.mockReset();
    mocks.axiosGet.mockReset();
  });

  describe('FreeOpenAIClient', () => {
    it('validates API key successfully', async () => {
      mocks.openAiRetrieve.mockResolvedValueOnce({});
      const client = new FreeOpenAIClient('openai', () => 'sk-test');
      const result = await client.validateApiKey('sk-test');
      expect(result.valid).toBe(true);
      expect(mocks.openAiRetrieve).toHaveBeenCalledWith('gpt-4o-mini');
    });

    it('reports validation errors', async () => {
      mocks.openAiRetrieve.mockRejectedValueOnce(new Error('Invalid key'));
      const client = new FreeOpenAIClient('openai', () => 'sk-test');
      const result = await client.validateApiKey('sk-test');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid key');
    });
  });

  describe('FreeAnthropicClient', () => {
    it('validates API key successfully', async () => {
      mocks.axiosGet.mockResolvedValueOnce({ data: { data: [] } });
      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      const result = await client.validateApiKey('sk-ant');
      expect(result.valid).toBe(true);
      expect(mocks.axiosGet).toHaveBeenCalledWith('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': 'sk-ant',
          'anthropic-version': '2023-06-01',
        },
      });
    });

    it('rejects empty API keys', async () => {
      const client = new FreeAnthropicClient('anthropic', () => '');
      const result = await client.validateApiKey('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('returns descriptive errors when validation fails', async () => {
      mocks.axiosGet.mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { error: { message: 'bad anthro key' } } },
      });
      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      const result = await client.validateApiKey('sk-ant');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('bad anthro key');
    });

    it('fetches text models via Anthropic API', async () => {
      mocks.axiosGet.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'claude-3', model: 'unused' },
            { model: 'legacy-haiku' },
            {},
          ],
        },
      });
      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      await expect(client.listAvailableTextModels()).resolves.toEqual([
        'claude-3',
        'legacy-haiku',
      ]);
    });
  });

  describe('FreeGoogleClient', () => {
    it('validates API key successfully', async () => {
      mocks.axiosGet.mockResolvedValueOnce({ data: { models: [{ name: 'gemini' }] } });
      const client = new FreeGoogleClient('google', () => 'AIza-test');
      const result = await client.validateApiKey('AIza-test');
      expect(result.valid).toBe(true);
      expect(mocks.axiosGet).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/models', {
        params: {
          key: 'AIza-test',
        },
      });
    });

    it('reports invalid API keys', async () => {
      mocks.axiosGet.mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { error: { message: 'denied' } } },
      });
      const client = new FreeGoogleClient('google', () => 'bad-key');
      const result = await client.validateApiKey('bad-key');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('denied');
    });

    it('parses model identifiers from API paths', async () => {
      mocks.axiosGet.mockResolvedValueOnce({
        data: {
          models: [
            { name: 'models/gemini-1.5-pro' },
            { name: 'models/gemini-1.5-flash' },
            { name: '' },
          ],
        },
      });
      const client = new FreeGoogleClient('google', () => 'AIza-test');
      await expect(client.listAvailableTextModels()).resolves.toEqual([
        'gemini-1.5-pro',
        'gemini-1.5-flash',
      ]);
    });
  });

  describe('FreeXAIClient', () => {
    it('returns descriptive error on failure', async () => {
      mocks.axiosGet.mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { error: { message: 'Unauthorized' } } },
      });
      const client = new FreeXAIClient('xai', () => 'xai-test');
      const result = await client.validateApiKey('xai-test');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('accepts valid API keys', async () => {
      mocks.axiosGet.mockResolvedValueOnce({ data: { data: [] } });
      const client = new FreeXAIClient('xai', () => 'xai-test');
      await expect(client.validateApiKey('xai-test')).resolves.toEqual({ valid: true });
    });

    it('lists models returned by the API', async () => {
      mocks.axiosGet.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'grok-2' },
            { name: 'grok-2-mini' },
            {},
          ],
        },
      });
      const client = new FreeXAIClient('xai', () => 'xai-test');
      await expect(client.listAvailableTextModels()).resolves.toEqual([
        'grok-2',
        'grok-2-mini',
      ]);
    });
  });

  describe('FreeOpenAIClient streaming', () => {
    it('streams chunks via OpenAI chat completions', async () => {
      mocks.openAiChatCreate.mockResolvedValueOnce(
        createAsyncStream([
          { choices: [{ delta: { content: 'Hello' } }] },
          { choices: [{ delta: { content: ' world' }, finish_reason: 'stop' }] },
        ]),
      );

      const client = new FreeOpenAIClient('openai', () => 'sk-test');
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await client.streamResponse('prompt', 'gpt-4o', onChunk, onComplete, onError);

      expect(mocks.openAiChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          stream: true,
          messages: [{ role: 'user', content: 'prompt' }],
        }),
      );
      expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello');
      expect(onChunk).toHaveBeenNthCalledWith(2, ' world');
      expect(onComplete).toHaveBeenCalledWith('Hello world', expect.any(Number));
      expect(onError).not.toHaveBeenCalled();
    });

    it('surfaces provider errors when streaming fails', async () => {
      mocks.openAiChatCreate.mockRejectedValueOnce(new Error('stream failed'));

      const client = new FreeOpenAIClient('openai', () => 'sk-test');
      const onError = vi.fn();

      await client.streamResponse('prompt', 'gpt-4o', vi.fn(), vi.fn(), onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'stream failed' }),
      );
    });

    it('handles array-based delta payloads', async () => {
      mocks.openAiChatCreate.mockResolvedValueOnce(
        createAsyncStream([
          {
            choices: [
              {
                delta: {
                  content: [
                    { text: 'Segment ' },
                    { text: 'two' },
                  ],
                },
              },
            ],
          },
          { choices: [{ finish_reason: 'stop' }] },
        ]),
      );

      const client = new FreeOpenAIClient('openai', () => 'sk-test');
      const onChunk = vi.fn();
      const onComplete = vi.fn();

      await client.streamResponse('prompt', 'gpt-4o', onChunk, onComplete, vi.fn());

      expect(onChunk).toHaveBeenNthCalledWith(1, 'Segment ');
      expect(onChunk).toHaveBeenNthCalledWith(2, 'two');
      expect(onComplete).toHaveBeenCalledWith('Segment two', expect.any(Number));
    });
  });

  it('falls back to default text models when API key missing', async () => {
    const fallback = ['Mock Text'];
    const fallbackSpy = vi
      .spyOn(MockProviderClient.prototype, 'listAvailableTextModels')
      .mockResolvedValueOnce(fallback);
    const client = new FreeOpenAIClient('openai', () => null);

    await expect(client.listAvailableTextModels()).resolves.toEqual(fallback);
    fallbackSpy.mockRestore();
  });

  it('lists text models via provider API when key available', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [
        { id: 'gpt-4o' },
        { id: 'o1-preview' },
      ],
    });
    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();
    expect(models).toEqual(['gpt-4o', 'o1-preview']);
  });

  it('requires API keys for stream and embedding operations in the base client', async () => {
    const onError = vi.fn();
    const client = new TestFreeClient(() => null);
    await client.streamResponse('prompt', 'model', vi.fn(), vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Missing API key'),
      }),
    );

    await expect(client.generateEmbeddings('text')).rejects.toThrow('Missing API key');
  });

  it('falls back to mock text models when fetchTextModels fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const mockDefault = vi
      .spyOn(MockProviderClient.prototype, 'listAvailableTextModels')
      .mockResolvedValueOnce(['mock-entry']);
    const client = new TestFreeClient(() => 'sk-test', true);

    await expect(client.listAvailableTextModels()).resolves.toEqual(['mock-entry']);
    expect(warnSpy).toHaveBeenCalled();
    mockDefault.mockRestore();
    warnSpy.mockRestore();
  });
});
