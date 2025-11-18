import type { AIProvider, ProviderMode, ProviderName } from '../types';
import { MockProviderClient } from '../clients/mock/MockProviderClient';
import { FreeOpenAIClient } from '../clients/openai/FreeOpenAIClient';
import { FreeAnthropicClient } from '../clients/anthropic/FreeAnthropicClient';
import { FreeGoogleClient } from '../clients/google/FreeGoogleClient';
import { FreeXAIClient } from '../clients/xai/FreeXAIClient';

interface CreateProviderClientOptions {
  provider: ProviderName;
  mode: ProviderMode;
  getApiKey?: () => string | null;
}

export function createProviderClient({
  provider,
  mode,
  getApiKey,
}: CreateProviderClientOptions): AIProvider {
  if (mode === 'mock') {
    return new MockProviderClient({ providerFilter: provider });
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
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  throw new Error(`Provider mode '${mode}' not yet implemented.`);
}
