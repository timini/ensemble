import {
  ProviderRegistry,
  createProviderClient,
  type ProviderName,
} from '@ensemble-ai/shared-utils/providers';
import { useStore } from '~/store';
import { selectEndpointConfigs } from '~/store/slices/endpointsSlice';
import {
  captureMockErrorScenarios,
  createMockErrorResolver,
} from '~/lib/mockErrorScenarios';

const PROVIDERS: ProviderName[] = [
  'openai',
  'anthropic',
  'google',
  'xai',
  'deepseek',
  'perplexity',
  'openai-compatible',
];

function tabStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const isMockMode = () => process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// The query is read once per page load. initializeProviders runs again before
// every stream; reading it again would bring back `once` scenarios that
// already fired while the URL still carries them (the workspace keeps it).
let mockErrorsCaptured = false;

export function initializeProviders(): void {
  const registry = ProviderRegistry.getInstance();
  const getState = () => useStore.getState();

  // Mock mode only: `?mockErrors=...` simulates provider failures (see
  // lib/mockErrorScenarios.ts). Never active in Free or Pro mode.
  const storage = tabStorage();
  if (isMockMode() && storage && !mockErrorsCaptured) {
    captureMockErrorScenarios(window.location.search, storage);
    mockErrorsCaptured = true;
  }

  PROVIDERS.forEach((provider) => {
    if (!registry.hasProvider(provider, 'mock')) {
      registry.register(
        provider,
        'mock',
        createProviderClient({
          provider,
          mode: 'mock',
          mockErrorScenarios: isMockMode()
            ? createMockErrorResolver(tabStorage)
            : undefined,
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
          getApiKey: () =>
            provider === 'openai-compatible' ? null : (getState().apiKeys[provider]?.key ?? null),
          // OpenAI-compatible endpoints that passed their check, read at call time.
          getEndpoints: () => selectEndpointConfigs(getState()),
        }),
      );
    }
  });
}
