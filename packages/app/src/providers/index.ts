/**
 * Provider Registry Initialization
 *
 * Registers all 4 providers (OpenAI, Anthropic, Google, XAI) with MockAPIClient for Phase 2.
 */

import { ProviderRegistry } from './ProviderRegistry';
import { OpenAIProvider } from './implementations/OpenAIProvider';
import { AnthropicProvider } from './implementations/AnthropicProvider';
import { GoogleProvider } from './implementations/GoogleProvider';
import { XAIProvider } from './implementations/XAIProvider';
import { FreeAPIClient } from './clients/FreeAPIClient';
import type { AIProvider } from './interfaces/AIProvider';
import { useStore } from '~/store';

/**
 * Initialize provider registry with all providers
 *
 * Call this once at app startup to register all providers.
 *
 * @example
 * ```typescript
 * import { initializeProviders } from '@/providers';
 * initializeProviders();
 * ```
 */
export function initializeProviders(): void {
  const registry = ProviderRegistry.getInstance();

  const registerIfMissing = (
    providerName: 'openai' | 'anthropic' | 'google' | 'xai',
    mode: 'mock' | 'free',
    factory: () => AIProvider,
  ) => {
    if (!registry.hasProvider(providerName, mode)) {
      registry.register(providerName, mode, factory());
    }
  };

  registerIfMissing('openai', 'mock', () => new OpenAIProvider());
  registerIfMissing('anthropic', 'mock', () => new AnthropicProvider());
  registerIfMissing('google', 'mock', () => new GoogleProvider());
  registerIfMissing('xai', 'mock', () => new XAIProvider());

  const storeGetter = () => useStore.getState();

  registerIfMissing('openai', 'free', () => new FreeAPIClient('openai', () => storeGetter().apiKeys.openai?.key ?? null));
  registerIfMissing('anthropic', 'free', () => new FreeAPIClient('anthropic', () => storeGetter().apiKeys.anthropic?.key ?? null));
  registerIfMissing('google', 'free', () => new FreeAPIClient('google', () => storeGetter().apiKeys.google?.key ?? null));
  registerIfMissing('xai', 'free', () => new FreeAPIClient('xai', () => storeGetter().apiKeys.xai?.key ?? null));
}

// Export registry and providers for convenience
export { ProviderRegistry } from './ProviderRegistry';
export { OpenAIProvider } from './implementations/OpenAIProvider';
export { AnthropicProvider } from './implementations/AnthropicProvider';
export { GoogleProvider } from './implementations/GoogleProvider';
export { XAIProvider } from './implementations/XAIProvider';
export { MockAPIClient } from './clients/MockAPIClient';
export { FreeAPIClient } from './clients/FreeAPIClient';
export type { AIProvider, ModelMetadata, ValidationResult } from './interfaces/AIProvider';
