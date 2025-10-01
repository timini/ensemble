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

  // Register all providers for mock mode (Phase 2)
  registry.register('openai', 'mock', new OpenAIProvider());
  registry.register('anthropic', 'mock', new AnthropicProvider());
  registry.register('google', 'mock', new GoogleProvider());
  registry.register('xai', 'mock', new XAIProvider());
}

// Export registry and providers for convenience
export { ProviderRegistry } from './ProviderRegistry';
export { OpenAIProvider } from './implementations/OpenAIProvider';
export { AnthropicProvider } from './implementations/AnthropicProvider';
export { GoogleProvider } from './implementations/GoogleProvider';
export { XAIProvider } from './implementations/XAIProvider';
export { MockAPIClient } from './clients/MockAPIClient';
export type { AIProvider, ModelMetadata, ValidationResult } from './interfaces/AIProvider';
