import { describe, expect, it } from 'vitest';
import { getModelPrice } from './prices';
import { computeRunCost } from './runCost';
import { estimateRun } from './estimateRun';
import type { EndpointLocation, PriceTable } from './types';

const table: PriceTable = {
  source: 'test',
  fetchedAt: '2026-11-16',
  models: {
    'openai/gpt-oss-120b': { inputPerMillion: 0.1, outputPerMillion: 0.5, openRouterId: 'openai/gpt-oss-120b' },
    'anthropic/claude-opus-5-5': { inputPerMillion: 4, outputPerMillion: 20, openRouterId: 'anthropic/claude-opus-5.5' },
    'openrouter/qwen/qwen3.5-9b': { inputPerMillion: 0.17, outputPerMillion: 0.25, openRouterId: 'qwen/qwen3.5-9b' },
  },
};

const endpoints: EndpointLocation[] = [
  { id: 'ollama', baseURL: 'http://localhost:11434/v1' },
  { id: 'lmstudio-2', baseURL: 'http://127.0.0.1:1234/v1' },
  { id: 'llamacpp', baseURL: 'http://[::1]:8080/v1' },
  { id: 'vllm', baseURL: 'http://localhost:8000/v1' },
  { id: 'vllm-2', baseURL: 'https://gpu.example.com/v1' },
  { id: 'ollama-2', baseURL: 'https://openrouter.ai/api/v1' },
  { id: 'openrouter', baseURL: 'https://openrouter.ai/api/v1' },
  { id: 'openrouter-2', baseURL: 'https://proxy.example.com/v1' },
  { id: 'groq', baseURL: 'https://api.groq.com/openai/v1' },
  { id: 'together', baseURL: 'https://api.together.ai/v1' },
  { id: 'custom', baseURL: 'http://localhost:4000/v1' },
];

const price = (id: string) => getModelPrice('openai-compatible', id, table, endpoints);
const LOCAL = { status: 'known', inputPerMillion: 0, outputPerMillion: 0, local: true };

describe('OpenAI-compatible endpoint prices', () => {
  it('prices local presets on a loopback URL at zero and labels them local', () => {
    for (const id of ['ollama/llama3.2:3b', 'lmstudio-2/qwen', 'llamacpp/model', 'vllm/meta-llama/x']) {
      expect(price(id)).toEqual(LOCAL);
    }
  });

  it('leaves a local preset pointed at a remote host unpriced', () => {
    expect(price('vllm-2/meta-llama/x')).toEqual({ status: 'unknown' });
    expect(price('ollama-2/anthropic/claude-opus-5.5')).toEqual({ status: 'unknown' });
  });

  it('leaves a Custom endpoint unpriced even on localhost, since it may proxy a paid API', () => {
    expect(price('custom/llama3')).toEqual({ status: 'unknown' });
  });

  it('prices OpenRouter models by their OpenRouter id when the URL is OpenRouter', () => {
    expect(price('openrouter/anthropic/claude-opus-5.5')).toEqual({
      status: 'known',
      inputPerMillion: 4,
      outputPerMillion: 20,
    });
    expect(price('openrouter-2/anthropic/claude-opus-5.5')).toEqual({ status: 'unknown' });
  });

  it('prices open-weight OpenRouter models from their openrouter/ entries', () => {
    expect(price('openrouter/qwen/qwen3.5-9b')).toEqual({
      status: 'known',
      inputPerMillion: 0.17,
      outputPerMillion: 0.25,
    });
  });

  it('leaves Groq and Together unpriced, since the table holds OpenRouter prices', () => {
    expect(price('groq/openai/gpt-oss-120b')).toEqual({ status: 'unknown' });
    expect(price('together/OpenAI/GPT-OSS-120B')).toEqual({ status: 'unknown' });
  });

  it('leaves unknown endpoints and unqualified ids unpriced', () => {
    expect(price('ollama-9/llama3')).toEqual({ status: 'unknown' });
    expect(price('not-qualified')).toEqual({ status: 'unknown' });
    expect(getModelPrice('openai-compatible', 'ollama/llama3', table)).toEqual({ status: 'unknown' });
  });

  it('counts local calls in the run cost and the estimate', () => {
    const cost = computeRunCost(
      [
        { provider: 'openai-compatible', modelId: 'ollama/a', inputTokens: 10, outputTokens: 10, source: 'reported' },
        { provider: 'openai-compatible', modelId: 'custom/b', inputTokens: 10, outputTokens: 10, source: 'reported' },
      ],
      table,
      endpoints,
    );
    expect(cost).toMatchObject({ totalUsd: 0, pricedCallCount: 1, localCallCount: 1, unpricedCallCount: 1 });

    const estimate = estimateRun({
      models: [
        { provider: 'openai-compatible', modelId: 'ollama/a' },
        { provider: 'openai-compatible', modelId: 'ollama/b' },
      ],
      consensusMethod: 'standard',
      summarizer: null,
      promptTokens: 20,
      eloTopN: 3,
      embeddings: { provider: 'openai-compatible', modelId: 'ollama/nomic-embed-text' },
      endpoints,
      table,
    });
    expect(estimate.cost).toMatchObject({ lowUsd: 0, highUsd: 0, unpricedCallCount: 0, localCallCount: 5 });
  });
});
