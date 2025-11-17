import type { AIProvider, ProviderMode, ProviderName } from '../types.js';

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;

  private readonly providers = new Map<ProviderName, Map<ProviderMode, AIProvider>>();

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: ProviderName, mode: ProviderMode, client: AIProvider): void {
    const modes = this.providers.get(provider) ?? new Map<ProviderMode, AIProvider>();
    modes.set(mode, client);
    this.providers.set(provider, modes);
  }

  getProvider(provider: ProviderName, mode: ProviderMode): AIProvider {
    const modes = this.providers.get(provider);
    if (!modes || !modes.has(mode)) {
      throw new Error(
        `Provider '${provider}' not found for mode '${mode}'. Did you forget to register it?`,
      );
    }
    return modes.get(mode)!;
  }

  hasProvider(provider: ProviderName, mode: ProviderMode): boolean {
    return this.providers.get(provider)?.has(mode) ?? false;
  }

  listProviders(mode: ProviderMode): ProviderName[] {
    const results: ProviderName[] = [];
    for (const [provider, modes] of this.providers.entries()) {
      if (modes.has(mode)) {
        results.push(provider);
      }
    }
    return results;
  }

  clearAll(): void {
    this.providers.clear();
  }
}

export const getProviderRegistry = () => ProviderRegistry.getInstance();
