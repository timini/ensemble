import { afterEach, describe, expect, it, vi } from 'vitest';
import { FreeDeepSeekClient } from '../clients/deepseek/FreeDeepSeekClient.js';
import { FreePerplexityClient } from '../clients/perplexity/FreePerplexityClient.js';
import { FreeOpenAIClient } from '../clients/openai/FreeOpenAIClient.js';
import { FreeAnthropicClient } from '../clients/anthropic/FreeAnthropicClient.js';
import { FreeGoogleClient } from '../clients/google/FreeGoogleClient.js';
import { FreeXAIClient } from '../clients/xai/FreeXAIClient.js';
import { MockProviderClient } from '../clients/mock/MockProviderClient.js';

// Ids that providers have retired. Hard-coded lists must not offer them.
const RETIRED_MODEL_IDS = [
  'deepseek-chat',
  'deepseek-reasoner',
  'sonar-reasoning',
  'sonar-deep-research',
  'gpt-4o',
  'gpt-4o-mini',
  'o1-preview',
  'claude-3-5-sonnet',
  'claude-3-opus',
  'claude-3-haiku',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'grok-beta',
  'grok-2',
  'grok-2-mini',
];

describe('hard-coded model lists', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('DeepSeek offers the current V4 Pro and Flash ids', async () => {
    const client = new FreeDeepSeekClient('deepseek', () => 'sk-ds');
    await expect(client.listAvailableTextModels()).resolves.toEqual([
      'deepseek-v4-pro',
      'deepseek-flash',
    ]);
  });

  it('Perplexity offers current Sonar ids only', async () => {
    const client = new FreePerplexityClient('perplexity', () => 'pplx');
    await expect(client.listAvailableTextModels()).resolves.toEqual([
      'sonar',
      'sonar-pro',
      'sonar-reasoning-pro',
    ]);
  });

  it('mock-mode branches of the free clients return current ids', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
    const lists = await Promise.all([
      new FreeOpenAIClient('openai', () => 'k').listAvailableTextModels(),
      new FreeAnthropicClient('anthropic', () => 'k').listAvailableTextModels(),
      new FreeGoogleClient('google', () => 'k').listAvailableTextModels(),
      new FreeXAIClient('xai', () => 'k').listAvailableTextModels(),
      new FreePerplexityClient('perplexity', () => 'k').listAvailableTextModels(),
    ]);
    expect(lists).toEqual([
      ['gpt-6-astra', 'gpt-6-luna'],
      ['claude-sonnet-5-5', 'claude-haiku-5-5'],
      ['gemini-4-carbon', 'gemini-4-hydrogen'],
      ['grok-4.7', 'grok-4.3'],
      ['sonar', 'sonar-pro', 'sonar-reasoning-pro'],
    ]);
  });

  it('MockProviderClient lists current ids only', () => {
    const ids = new MockProviderClient().listAvailableModels().map((model) => model.id);
    for (const retired of RETIRED_MODEL_IDS) {
      expect(ids).not.toContain(retired);
    }
    expect(ids).toEqual(
      expect.arrayContaining([
        'gpt-6-astra',
        'gpt-6-luna',
        'claude-opus-5-5',
        'claude-sonnet-5-5',
        'claude-haiku-5-5',
        'gemini-4-carbon',
        'gemini-4-hydrogen',
        'grok-4.7',
        'grok-4.3',
        'deepseek-v4-pro',
        'deepseek-flash',
        'sonar',
        'sonar-pro',
      ]),
    );
  });
});
