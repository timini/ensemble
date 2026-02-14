import {
  ProviderRegistry,
  createProviderClient,
  type ProviderName,
} from '@ensemble-ai/shared-utils/providers';
import type { EvalMode, EvalProvider } from '../types.js';

const API_KEY_ENV: Record<EvalProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
};

export function getApiKeyForProvider(provider: EvalProvider): string | null {
  const envName = API_KEY_ENV[provider];
  const key = process.env[envName];
  if (!key) {
    return null;
  }

  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function registerProviders(
  registry: ProviderRegistry,
  providers: EvalProvider[],
  mode: EvalMode,
): void {
  const uniqueProviders = [...new Set(providers)];

  for (const provider of uniqueProviders) {
    if (mode === 'free' && !getApiKeyForProvider(provider)) {
      throw new Error(
        `Missing API key for "${provider}". Set ${API_KEY_ENV[provider]} before running in free mode.`,
      );
    }

    registry.register(
      provider as ProviderName,
      mode,
      createProviderClient({
        provider: provider as ProviderName,
        mode,
        getApiKey: () => getApiKeyForProvider(provider),
      }),
    );
  }
}
