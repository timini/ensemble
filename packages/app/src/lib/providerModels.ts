import type { Model } from '@/components/organisms/ModelSelectionList';
import type {
  ProviderName,
  ProviderMode,
  ModelMetadata,
  AIProvider,
} from '@ensemble-ai/shared-utils/providers';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { AVAILABLE_MODELS } from './models';
import { toError } from './errors';

export function mapModelMetadataToModels(
  provider: ProviderName,
  metadata: ModelMetadata[],
): Model[] {
  return metadata
    .map((model) => {
      const id = model.id ?? model.name;
      if (!id) return null;
      return {
        id,
        name: model.name ?? id,
        provider,
      };
    })
    .filter((model): model is Model => Boolean(model));
}

export function replaceProviderModels(
  base: Model[],
  provider: ProviderName,
  replacements: Model[],
): Model[] {
  const index = base.findIndex((model) => model.provider === provider);
  const filtered = base.filter((model) => model.provider !== provider);

  if (index === -1) {
    return [...filtered, ...replacements];
  }

  const head = filtered.slice(0, index);
  const tail = filtered.slice(index);
  return [...head, ...replacements, ...tail];
}

export async function fetchProviderModels(options: {
  provider: ProviderName;
  mode: ProviderMode;
}): Promise<Model[]> {
  const registry = ProviderRegistry.getInstance();
  let client: AIProvider;
  try {
    client = registry.getProvider(options.provider, options.mode);
  } catch (error: unknown) {
    throw toError(
      error,
      `Provider '${options.provider}' not registered for mode '${options.mode}'`,
    );
  }

  const metadata = await Promise.resolve(client.listAvailableModels());
  return mapModelMetadataToModels(options.provider, metadata);
}

export function mergeDynamicModels(
  overrides: Partial<Record<ProviderName, Model[]>>,
): Model[] {
  let merged = AVAILABLE_MODELS;
  for (const provider of Object.keys(overrides) as ProviderName[]) {
    const models = overrides[provider];
    if (!models || models.length === 0) continue;
    merged = replaceProviderModels(merged, provider, models);
  }
  return merged;
}
