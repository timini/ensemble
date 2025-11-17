import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FreeOpenAIClient } from '../clients/openai/FreeOpenAIClient.js';
import { FreeXAIClient } from '../clients/xai/FreeXAIClient.js';
import { MockProviderClient } from '../clients/mock/MockProviderClient.js';
import { FreeAnthropicClient } from '../clients/anthropic/FreeAnthropicClient.js';
import { FreeGoogleClient } from '../clients/google/FreeGoogleClient.js';

const mocks = vi.hoisted(() => ({
  openAiRetrieve: vi.fn(),
  openAiList: vi.fn(),
  axiosGet: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    models = { retrieve: mocks.openAiRetrieve, list: mocks.openAiList };
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

describe('Free mode provider clients', () => {
  beforeEach(() => {
    mocks.openAiRetrieve.mockReset();
    mocks.openAiList.mockReset();
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
  });

  it('free clients fall back to mock streaming until implementations are ready', async () => {
    const streamSpy = vi
      .spyOn(MockProviderClient.prototype, 'streamResponse')
      .mockResolvedValue();
    const client = new FreeOpenAIClient('openai', () => 'sk-test');

    await client.streamResponse('prompt', 'gpt-4o', vi.fn(), vi.fn(), vi.fn());
    expect(streamSpy).toHaveBeenCalled();
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
});
