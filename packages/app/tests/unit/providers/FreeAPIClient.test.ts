import { describe, expect, it, beforeEach, vi } from 'vitest';
import { FreeAPIClient } from '~/providers/clients/FreeAPIClient';
import { MockAPIClient } from '~/providers/clients/MockAPIClient';

const mocks = vi.hoisted(() => ({
  openAiRetrieveMock: vi.fn(),
  anthropicListMock: vi.fn(),
  googleListModelsMock: vi.fn(),
  axiosGetMock: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    models = {
      retrieve: mocks.openAiRetrieveMock,
    };
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    models = {
      list: mocks.anthropicListMock,
    };
  },
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    constructor(_apiKey: string) {}

    listModels() {
      return mocks.googleListModelsMock();
    }
  },
}));

vi.mock('axios', () => {
  const isAxiosError = (
    error: unknown,
  ): error is { isAxiosError: boolean; response?: { data?: { error?: { message?: string }; message?: string } }; message?: string } =>
    typeof error === 'object' &&
    error !== null &&
    (error as { isAxiosError?: boolean }).isAxiosError === true;

  return {
    default: {
      get: mocks.axiosGetMock,
      isAxiosError,
    },
    get: mocks.axiosGetMock,
    isAxiosError,
  };
});

describe('FreeAPIClient', () => {
  beforeEach(() => {
    mocks.openAiRetrieveMock.mockReset();
    mocks.anthropicListMock.mockReset();
    mocks.googleListModelsMock.mockReset();
    mocks.axiosGetMock.mockReset();
    vi.restoreAllMocks();
  });

  it('validates OpenAI API key successfully', async () => {
    mocks.openAiRetrieveMock.mockResolvedValueOnce({});
    const client = new FreeAPIClient('openai', () => 'sk-test');

    const result = await client.validateApiKey('sk-test');

    expect(result.valid).toBe(true);
    expect(mocks.openAiRetrieveMock).toHaveBeenCalledWith('gpt-4o-mini');
  });

  it('returns error when OpenAI validation fails', async () => {
    mocks.openAiRetrieveMock.mockRejectedValueOnce(new Error('Invalid key'));
    const client = new FreeAPIClient('openai', () => 'sk-test');

    const result = await client.validateApiKey('sk-test');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid key');
  });

  it('validates Anthropic API key successfully', async () => {
    mocks.anthropicListMock.mockResolvedValueOnce({ data: [] });
    const client = new FreeAPIClient('anthropic', () => 'sk-ant');

    const result = await client.validateApiKey('sk-ant');

    expect(result.valid).toBe(true);
    expect(mocks.anthropicListMock).toHaveBeenCalled();
  });

  it('validates Google API key successfully', async () => {
    mocks.googleListModelsMock.mockResolvedValueOnce({ models: [{ name: 'gemini' }] });
    const client = new FreeAPIClient('google', () => 'AIza-test');

    const result = await client.validateApiKey('AIza-test');

    expect(result.valid).toBe(true);
    expect(mocks.googleListModelsMock).toHaveBeenCalled();
  });

  it('returns descriptive error for XAI validation failures', async () => {
    mocks.axiosGetMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: { message: 'Unauthorized' } } },
    });
    const client = new FreeAPIClient('xai', () => 'xai-test');

    const result = await client.validateApiKey('xai-test');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  it('falls back to mock streaming when API key is present', async () => {
    const streamSpy = vi
      .spyOn(MockAPIClient.prototype, 'streamResponse')
      .mockResolvedValue();

    const client = new FreeAPIClient('openai', () => 'sk-present');

    await client.streamResponse(
      'hello',
      'gpt-4o',
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );

    expect(streamSpy).toHaveBeenCalled();
  });

  it('invokes onError when API key is missing', async () => {
    const client = new FreeAPIClient('openai', () => null);
    const onError = vi.fn();

    await client.streamResponse('hello', 'gpt-4o', vi.fn(), vi.fn(), onError);

    expect(onError).toHaveBeenCalled();
  });

  it('returns mock embeddings when API key is missing', async () => {
    const embeddingsSpy = vi
      .spyOn(MockAPIClient.prototype, 'generateEmbeddings')
      .mockResolvedValue([0.1, 0.2]);

    const client = new FreeAPIClient('google', () => 'AIza-key');

    const result = await client.generateEmbeddings('test');

    expect(result).toEqual([0.1, 0.2]);
    expect(embeddingsSpy).toHaveBeenCalled();
  });
});
