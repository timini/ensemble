/**
 * ProviderRegistry
 *
 * Singleton registry for managing AI provider instances.
 * Provides centralized access to providers based on operating mode.
 *
 * @see packages/app/docs/PROVIDER_ARCHITECTURE.md
 */

import type { AIProvider } from './interfaces/AIProvider';

/**
 * Singleton registry for AI providers
 *
 * Usage:
 * ```typescript
 * const registry = ProviderRegistry.getInstance();
 * const provider = registry.getProvider('openai', 'mock');
 * await provider.streamResponse(...);
 * ```
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, Map<string, AIProvider>>;

  private constructor() {
    this.providers = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider for a specific mode
   *
   * @param providerName - Provider name ('openai', 'anthropic', 'google', 'xai')
   * @param mode - Operating mode ('mock', 'free', 'pro')
   * @param provider - AIProvider implementation
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * registry.register('openai', 'mock', new OpenAIProvider());
   * ```
   */
  register(
    providerName: string,
    mode: 'mock' | 'free' | 'pro',
    provider: AIProvider
  ): void {
    const key = `${providerName}:${mode}`;
    if (!this.providers.has(key)) {
      this.providers.set(key, new Map());
    }
    this.providers.get(key)!.set(mode, provider);
  }

  /**
   * Get a provider for a specific mode
   *
   * @param providerName - Provider name ('openai', 'anthropic', 'google', 'xai')
   * @param mode - Operating mode ('mock', 'free', 'pro')
   * @returns AIProvider instance
   * @throws Error if provider not found
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * const provider = registry.getProvider('openai', 'mock');
   * ```
   */
  getProvider(
    providerName: string,
    mode: 'mock' | 'free' | 'pro'
  ): AIProvider {
    const key = `${providerName}:${mode}`;
    const modeProviders = this.providers.get(key);

    if (!modeProviders?.has(mode)) {
      throw new Error(
        `Provider '${providerName}' not found for mode '${mode}'. Did you forget to register it?`
      );
    }

    return modeProviders.get(mode)!;
  }

  /**
   * List all registered provider names for a specific mode
   *
   * @param mode - Operating mode ('mock', 'free', 'pro')
   * @returns Array of provider names
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * const providers = registry.listProviders('mock');
   * console.log(providers); // ['openai', 'anthropic', 'google', 'xai']
   * ```
   */
  listProviders(mode: 'mock' | 'free' | 'pro'): string[] {
    const providerNames: string[] = [];

    for (const key of this.providers.keys()) {
      const [name, keyMode] = key.split(':');
      if (keyMode === mode) {
        providerNames.push(name!);
      }
    }

    return providerNames;
  }

  /**
   * Check if a provider is registered for a specific mode
   *
   * @param providerName - Provider name
   * @param mode - Operating mode
   * @returns True if provider is registered
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * if (registry.hasProvider('openai', 'mock')) {
   *   const provider = registry.getProvider('openai', 'mock');
   * }
   * ```
   */
  hasProvider(providerName: string, mode: 'mock' | 'free' | 'pro'): boolean {
    const key = `${providerName}:${mode}`;
    const modeProviders = this.providers.get(key);
    return modeProviders?.has(mode) ?? false;
  }

  /**
   * Clear all registered providers
   *
   * Mainly used for testing to reset the singleton state.
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * registry.clearAll(); // Reset for tests
   * ```
   */
  clearAll(): void {
    this.providers.clear();
  }
}

/**
 * Convenience function to get singleton instance
 */
export const getProviderRegistry = () => ProviderRegistry.getInstance();
