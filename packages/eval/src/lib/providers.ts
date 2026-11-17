import {
  ProviderRegistry,
  createProviderClient,
  type OpenAICompatibleEndpointConfig,
  type ProviderName,
} from '@ensemble-ai/shared-utils/providers';
import type { EvalEndpoint, EvalMode, EvalProvider } from '../types.js';

type KeyProvider = Exclude<EvalProvider, 'openai-compatible'>;

const API_KEY_ENV: Record<KeyProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getApiKeyForProvider(provider: EvalProvider): string | null {
  if (provider === 'openai-compatible') return null;
  return readEnv(API_KEY_ENV[provider]);
}

/**
 * Client configs for OpenAI-compatible endpoints, with keys read from each
 * endpoint's variable (OPENROUTER_API_KEY and so on). A missing key becomes
 * an empty string, which local servers accept.
 */
export function endpointConfigs(endpoints: readonly EvalEndpoint[]): OpenAICompatibleEndpointConfig[] {
  return endpoints.map((endpoint) => ({
    id: endpoint.id,
    baseURL: endpoint.baseURL,
    apiKey: readEnv(endpoint.apiKeyEnv) ?? '',
  }));
}

/**
 * Register a client per provider. `openai-compatible` needs the endpoints
 * its specs name (endpointsOf in modelSpecs.ts). In free mode a hosted
 * endpoint (OpenRouter, Groq, Together) must have its key set; local servers
 * and compat endpoints may run without one.
 */
export function registerProviders(
  registry: ProviderRegistry,
  providers: EvalProvider[],
  mode: EvalMode,
  endpoints: readonly EvalEndpoint[] = [],
): void {
  const uniqueProviders = [...new Set(providers)];

  for (const provider of uniqueProviders) {
    if (provider === 'openai-compatible') {
      registerCompat(registry, mode, endpoints);
      continue;
    }

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

function registerCompat(
  registry: ProviderRegistry,
  mode: EvalMode,
  endpoints: readonly EvalEndpoint[],
): void {
  if (mode === 'free') {
    if (endpoints.length === 0) {
      throw new Error('The openai-compatible provider needs at least one endpoint from a model spec.');
    }
    for (const endpoint of endpoints) {
      if (endpoint.requiresKey && !readEnv(endpoint.apiKeyEnv)) {
        throw new Error(
          `Missing API key for endpoint "${endpoint.id}". Set ${endpoint.apiKeyEnv} before running in free mode.`,
        );
      }
    }
  }
  const configs = endpointConfigs(endpoints);
  registry.register(
    'openai-compatible',
    mode,
    createProviderClient({ provider: 'openai-compatible', mode, getEndpoints: () => configs }),
  );
}
