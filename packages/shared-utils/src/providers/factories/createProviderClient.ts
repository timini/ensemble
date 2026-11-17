import type { AIProvider, ProviderMode, ProviderName } from '../types';
import { MockProviderClient, type MockClientConfig } from '../clients/mock/MockProviderClient';
import { FreeOpenAIClient } from '../clients/openai/FreeOpenAIClient';
import { FreeAnthropicClient } from '../clients/anthropic/FreeAnthropicClient';
import { FreeGoogleClient } from '../clients/google/FreeGoogleClient';
import { FreeXAIClient } from '../clients/xai/FreeXAIClient';
import { FreeDeepSeekClient } from '../clients/deepseek/FreeDeepSeekClient';
import { FreePerplexityClient } from '../clients/perplexity/FreePerplexityClient';
import {
  OpenAICompatibleEndpointsClient,
  type OpenAICompatibleEndpointConfig,
} from '../clients/openaiCompatible/OpenAICompatibleEndpointsClient';

interface CreateProviderClientOptions {
  provider: ProviderName;
  mode: ProviderMode;
  getApiKey?: () => string | null;
  /**
   * Configured OpenAI-compatible endpoints, read at call time. Required for
   * the `openai-compatible` provider in Free mode, which ignores getApiKey.
   */
  getEndpoints?: () => OpenAICompatibleEndpointConfig[];
  /** Simulated failures for mock clients (ignored in other modes). */
  mockErrorScenarios?: MockClientConfig['errorScenarios'];
}

export function createProviderClient({
  provider,
  mode,
  getApiKey,
  getEndpoints,
  mockErrorScenarios,
}: CreateProviderClientOptions): AIProvider {
  if (mode === 'mock') {
    return new MockProviderClient({ providerFilter: provider, errorScenarios: mockErrorScenarios });
  }

  if (mode === 'free' && provider === 'openai-compatible') {
    if (!getEndpoints) {
      throw new Error('The openai-compatible provider requires a getEndpoints callback.');
    }
    return new OpenAICompatibleEndpointsClient(getEndpoints);
  }

  if (mode === 'free') {
    if (!getApiKey) {
      throw new Error('Free mode clients require a getApiKey callback.');
    }

    switch (provider) {
      case 'openai':
        return new FreeOpenAIClient(provider, getApiKey);
      case 'anthropic':
        return new FreeAnthropicClient(provider, getApiKey);
      case 'google':
        return new FreeGoogleClient(provider, getApiKey);
      case 'xai':
        return new FreeXAIClient(provider, getApiKey);
      case 'deepseek':
        return new FreeDeepSeekClient(provider, getApiKey);
      case 'perplexity':
        return new FreePerplexityClient(provider, getApiKey);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  throw new Error(`Provider mode '${mode}' not yet implemented.`);
}
