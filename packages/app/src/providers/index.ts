import {
  ProviderRegistry,
  createProviderClient,
  type ProviderName,
} from '@ensemble-ai/shared-utils/providers';
import { useStore } from '~/store';

const PROVIDERS: ProviderName[] = ['openai', 'anthropic', 'google', 'xai'];

export function initializeProviders(): void {
  const registry = ProviderRegistry.getInstance();
  const getState = () => useStore.getState();

  PROVIDERS.forEach((provider) => {
    if (!registry.hasProvider(provider, 'mock')) {
      registry.register(
        provider,
        'mock',
        createProviderClient({
          provider,
          mode: 'mock',
        }),
      );
    }

    if (!registry.hasProvider(provider, 'free')) {
      registry.register(
        provider,
        'free',
        createProviderClient({
          provider,
          mode: 'free',
          getApiKey: () => getState().apiKeys[provider]?.key ?? null,
        }),
      );
    }
  });
}
