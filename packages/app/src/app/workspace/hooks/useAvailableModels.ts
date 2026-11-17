import { useEffect, useState } from 'react';
import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import type { Model } from '@/components/organisms/ModelSelectionList';
import { FALLBACK_MODELS } from '~/lib/models';
import { fetchProviderModels, mergeDynamicModels } from '~/lib/providerModels';
import { toError } from '~/lib/errors';
import { logger } from '~/lib/logger';
import type { OperatingMode } from '~/store/slices/modeSlice';
import { PROVIDERS } from '~/lib/ensembleConstants';
import { fetchEndpointModels, type EndpointLabel } from '~/lib/endpointModels';

interface UseAvailableModelsOptions {
  hasHydrated: boolean;
  mode: OperatingMode;
  hydratedStatuses: Record<Provider, ValidationStatus>;
  /** Connected OpenAI-compatible endpoints. Their models are listed live. */
  endpoints?: readonly EndpointLabel[];
}

const NO_ENDPOINTS: readonly EndpointLabel[] = [];

export function useAvailableModels({
  hasHydrated,
  mode,
  hydratedStatuses,
  endpoints = NO_ENDPOINTS,
}: UseAvailableModelsOptions): Model[] {
  const [availableModels, setAvailableModels] =
    useState<Model[]>(FALLBACK_MODELS);

  useEffect(() => {
    if (!hasHydrated || mode !== 'free') {
      setAvailableModels(FALLBACK_MODELS);
      return;
    }

    let active = true;
    const loadModels = async () => {
      const activeProviders = PROVIDERS.filter(provider => hydratedStatuses[provider] === 'valid');
      logger.debug('[useAvailableModels] Fetching models for:', activeProviders);

      const overrides: Partial<Record<Provider | 'openai-compatible', Model[]>> = {};

      await Promise.all(
        PROVIDERS.map(async (provider) => {
          if (hydratedStatuses[provider] !== 'valid') {
            return;
          }

          try {
            const models = await fetchProviderModels({
              provider,
              mode: 'free',
            });
            if (models.length > 0) {
              overrides[provider] = models;
            }
          } catch (error: unknown) {
            console.warn(
              `Failed to load ${provider} models`,
              toError(error, `Failed to load ${provider} models`),
            );
          }
        }),
      );

      try {
        const endpointModels = await fetchEndpointModels(endpoints);
        if (endpointModels.length > 0) {
          overrides['openai-compatible'] = endpointModels;
        }
      } catch (error: unknown) {
        console.warn(
          'Failed to load OpenAI-compatible endpoint models',
          toError(error, 'Failed to load endpoint models'),
        );
      }

      if (!active) return;
      if (Object.keys(overrides).length === 0) {
        setAvailableModels(FALLBACK_MODELS);
        return;
      }
      setAvailableModels(mergeDynamicModels(overrides));
    };

    void loadModels();
    return () => {
      active = false;
    };
  }, [hasHydrated, mode, hydratedStatuses, endpoints]);

  return availableModels;
}
