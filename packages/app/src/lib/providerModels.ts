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
import { initializeProviders } from '~/providers';

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

type TextModelCapableProvider = AIProvider & {
  listAvailableTextModels: () => Promise<string[]>;
};

export async function fetchProviderModels(options: {
  provider: ProviderName;
  mode: ProviderMode;
}): Promise<Model[]> {
  initializeProviders();

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

  const metadata = mapModelMetadataToModels(
    options.provider,
    await Promise.resolve(client.listAvailableModels()),
  );
  const metadataMap = new Map(metadata.map((model) => [model.id, model]));

  if (!('listAvailableTextModels' in client)) {
    return metadata;
  }

  try {
    const textModels = await (client as TextModelCapableProvider).listAvailableTextModels();
    const resolved = textModels
      .map((raw) => sanitizeModelIdentifier(raw))
      .filter((value): value is string => value.length > 0)
      .map((id) => metadataMap.get(id) ?? createModelFromId(options.provider, id));

    if (resolved.length > 0) {
      return resolved;
    }
  } catch (error: unknown) {
    console.warn(
      `Failed to load dynamic models for ${options.provider}`,
      toError(error, 'Unable to load dynamic provider models'),
    );
  }

  return metadata;
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

function createModelFromId(provider: ProviderName, identifier: string): Model {
  return {
    id: identifier,
    name: formatModelLabelFromId(identifier),
    provider,
  };
}

export function sanitizeModelIdentifier(value: string): string {
  return value.replace(/^models\//i, '').trim();
}

export function formatModelLabelFromId(rawId: string): string {
  const identifier = sanitizeModelIdentifier(rawId);
  if (identifier.length === 0) {
    return rawId;
  }

  return identifier
    .split(/[-_]/g)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
