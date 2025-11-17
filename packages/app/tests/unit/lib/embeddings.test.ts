import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateEmbeddingsForResponses,
  resolveEmbeddingsMode,
} from '~/lib/embeddings';
import {
  MockProviderClient,
  ProviderRegistry,
} from '@ensemble-ai/shared-utils/providers';
import type { ModelResponse } from '~/store';

const registry = ProviderRegistry.getInstance();
const originalMockMode = process.env.NEXT_PUBLIC_MOCK_MODE;

const createResponse = (modelId: string, response: string): ModelResponse => ({
  modelId,
  provider: 'openai',
  model: 'gpt-4o',
  response,
  isStreaming: false,
  isComplete: true,
  responseTime: 1200,
  error: null,
});

class TrackingClient extends MockProviderClient {
  calls = 0;

  override async generateEmbeddings(text: string): Promise<number[]> {
    this.calls += 1;
    return super.generateEmbeddings(text);
  }
}

beforeEach(() => {
  registry.clearAll();
  registry.register('openai', 'mock', new MockProviderClient());
});

afterEach(() => {
  process.env.NEXT_PUBLIC_MOCK_MODE = originalMockMode;
});

describe('generateEmbeddingsForResponses', () => {
  it('returns embeddings for completed responses', async () => {
    const responses = [
      createResponse('model-a', 'First response'),
      createResponse('model-b', 'Second response'),
    ];

    const result = await generateEmbeddingsForResponses({
      responses,
      provider: 'openai',
      mode: 'free',
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.modelId).toBe('model-a');
    expect(result[0]?.embedding).toHaveLength(1536);
    expect(result[1]?.modelId).toBe('model-b');
  });

  it('skips generating embeddings already present in cache', async () => {
    const trackingClient = new TrackingClient();
    registry.clearAll();
    registry.register('openai', 'mock', trackingClient);

    const responses = [
      createResponse('model-a', 'Cached response'),
      createResponse('model-b', 'Needs embedding'),
    ];

    const existingEmbeddings = [
      { modelId: 'model-a', embedding: [0, 0, 1] },
    ];

    const result = await generateEmbeddingsForResponses({
      responses,
      provider: 'openai',
      mode: 'free',
      existingEmbeddings,
    });

    expect(result).toHaveLength(2);
    expect(trackingClient.calls).toBe(1);
    expect(result[0]?.embedding).toEqual(existingEmbeddings[0]?.embedding);
  });

  it('invokes onError callback when embedding generation fails', async () => {
    class ErroringClient extends MockProviderClient {
      override async generateEmbeddings(): Promise<number[]> {
        throw new Error('boom');
      }
    }

    registry.clearAll();
    registry.register('openai', 'mock', new ErroringClient());

    const responses = [createResponse('model-a', 'text')];
    const onError = vi.fn();

    const result = await generateEmbeddingsForResponses({
      responses,
      provider: 'openai',
      mode: 'free',
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('model-a', expect.any(Error));
    expect(result).toHaveLength(0);
  });
});

describe('resolveEmbeddingsMode', () => {
  it('returns mock mode when override enabled', () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = 'true';
    expect(resolveEmbeddingsMode('free')).toBe('mock');
    expect(resolveEmbeddingsMode('pro')).toBe('mock');
  });

  it('returns provided mode when override disabled', () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = 'false';
    expect(resolveEmbeddingsMode('free')).toBe('free');
    expect(resolveEmbeddingsMode('pro')).toBe('pro');
  });
});
