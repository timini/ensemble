import {
  ProviderRegistry,
  type ProviderMode,
} from '@ensemble-ai/shared-utils/providers';
import type { ModelResponse } from '~/store';
import type { ProviderType } from '~/store/slices/ensembleSlice';

export type EmbeddingVector = {
  modelId: string;
  embedding: number[];
};

export interface GenerateEmbeddingsOptions {
  responses: ModelResponse[];
  provider: ProviderType;
  mode: ProviderMode;
  existingEmbeddings?: EmbeddingVector[];
  onError?: (modelId: string, error: Error) => void;
}

function isEmbeddableResponse(response: ModelResponse): boolean {
  return (
    response.isComplete &&
    !response.error &&
    response.response.trim().length > 0
  );
}

/**
 * Resolve the provider mode taking the MOCK_MODE override into account.
 */
export function resolveEmbeddingsMode(mode: ProviderMode): ProviderMode {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    return 'mock';
  }
  return mode;
}

/**
 * Generate embeddings for the given responses using the selected provider.
 *
 * Existing embeddings are preserved to avoid duplicate API calls. Only responses
 * that have completed successfully are processed.
 */
export async function generateEmbeddingsForResponses({
  responses,
  provider,
  mode,
  existingEmbeddings = [],
  onError,
}: GenerateEmbeddingsOptions): Promise<EmbeddingVector[]> {
  const embeddableResponses = responses.filter(isEmbeddableResponse);
  if (embeddableResponses.length === 0) {
    return [];
  }

  const registry = ProviderRegistry.getInstance();
  const resolvedMode = resolveEmbeddingsMode(mode);
  let client;

  try {
    client = registry.getProvider(provider, resolvedMode);
  } catch (error) {
    if (resolvedMode !== 'mock' && registry.hasProvider(provider, 'mock')) {
      client = registry.getProvider(provider, 'mock');
    } else {
      throw error;
    }
  }

  const handleError =
    onError ??
    ((modelId: string, error: Error) => {
      console.error(
        `Failed to generate embeddings for ${modelId} via ${provider} (${resolvedMode})`,
        error,
      );
    });

  const embeddingMap = new Map(
    existingEmbeddings.map((entry) => [entry.modelId, entry.embedding]),
  );

  for (const response of embeddableResponses) {
    if (embeddingMap.has(response.modelId)) {
      continue;
    }

    try {
      const embedding = await client.generateEmbeddings(response.response);
      embeddingMap.set(response.modelId, embedding);
    } catch (error) {
      handleError(response.modelId, error as Error);
    }
  }

  return embeddableResponses
    .map((response) => {
      const embedding = embeddingMap.get(response.modelId);
      if (!embedding) {
        return null;
      }
      return { modelId: response.modelId, embedding };
    })
    .filter((value): value is EmbeddingVector => value !== null);
}
