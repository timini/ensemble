import { describe, expect, it } from 'vitest';
import { getModelPrice } from './prices';
import { computeRunCost } from './runCost';
import { estimateRun } from './estimateRun';
import type { PriceTable } from './types';

const table: PriceTable = {
  source: 'test',
  fetchedAt: '2026-11-16',
  models: {
    'openai/gpt-oss-120b': { inputPerMillion: 0.1, outputPerMillion: 0.5, openRouterId: 'openai/gpt-oss-120b' },
    'anthropic/claude-opus-5-5': { inputPerMillion: 4, outputPerMillion: 20, openRouterId: 'anthropic/claude-opus-5.5' },
  },
};

describe('OpenAI-compatible endpoint prices', () => {
  it('prices local endpoints at zero and labels them local', () => {
    for (const id of ['ollama/llama3.2:3b', 'lmstudio-2/qwen', 'llamacpp/model', 'vllm/meta-llama/x']) {
      expect(getModelPrice('openai-compatible', id, table)).toEqual({
        status: 'known',
        inputPerMillion: 0,
        outputPerMillion: 0,
        local: true,
      });
    }
  });

  it('prices OpenRouter models by their OpenRouter id', () => {
    expect(getModelPrice('openai-compatible', 'openrouter/anthropic/claude-opus-5.5', table)).toEqual({
      status: 'known',
      inputPerMillion: 4,
      outputPerMillion: 20,
    });
  });

  it('prices Groq and Together models whose id is in the table', () => {
    expect(getModelPrice('openai-compatible', 'groq/openai/gpt-oss-120b', table)).toMatchObject({
      status: 'known',
      inputPerMillion: 0.1,
    });
    expect(getModelPrice('openai-compatible', 'together/OpenAI/GPT-OSS-120B', table)).toMatchObject({
      status: 'known',
    });
  });

  it('leaves hosted models without a table entry, and Custom endpoints, unpriced', () => {
    expect(getModelPrice('openai-compatible', 'groq/llama-3.3-70b-versatile', table)).toEqual({ status: 'unknown' });
    expect(getModelPrice('openai-compatible', 'custom/llama3', table)).toEqual({ status: 'unknown' });
    expect(getModelPrice('openai-compatible', 'not-qualified', table)).toEqual({ status: 'unknown' });
  });

  it('counts local calls in the run cost and the estimate', () => {
    const cost = computeRunCost(
      [
        { provider: 'openai-compatible', modelId: 'ollama/a', inputTokens: 10, outputTokens: 10, source: 'reported' },
        { provider: 'openai-compatible', modelId: 'custom/b', inputTokens: 10, outputTokens: 10, source: 'reported' },
      ],
      table,
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
      table,
    });
    expect(estimate.cost).toMatchObject({ lowUsd: 0, highUsd: 0, unpricedCallCount: 0, localCallCount: 5 });
  });
});
