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
import type { AIProvider } from './interfaces/AIProvider';

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
    factory: () => AIProvider,
  ) => {
    if (!registry.hasProvider(providerName, 'mock')) {
      registry.register(providerName, 'mock', factory());
    }
  };

  registerIfMissing('openai', () => new OpenAIProvider());
  registerIfMissing('anthropic', () => new AnthropicProvider());
  registerIfMissing('google', () => new GoogleProvider());
  registerIfMissing('xai', () => new XAIProvider());
}

// Export registry and providers for convenience
export { ProviderRegistry } from './ProviderRegistry';
export { OpenAIProvider } from './implementations/OpenAIProvider';
export { AnthropicProvider } from './implementations/AnthropicProvider';
export { GoogleProvider } from './implementations/GoogleProvider';
export { XAIProvider } from './implementations/XAIProvider';
export { MockAPIClient } from './clients/MockAPIClient';
export type { AIProvider, ModelMetadata, ValidationResult } from './interfaces/AIProvider';
