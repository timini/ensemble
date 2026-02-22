import { useEffect, useRef } from 'react';
import type { ProviderType } from '~/store/slices/ensembleSlice';
import type { OperatingMode } from '~/store/slices/modeSlice';
import { generateEmbeddingsForResponses } from '~/lib/embeddings';
import { toError } from '~/lib/errors';
import { logger } from '~/lib/logger';
import type { ModelResponse } from '~/store';
type Embedding = { modelId: string; embedding: number[] };

interface UseResponseEmbeddingsOptions {
  hasHydrated: boolean;
  completedResponses: ModelResponse[];
  embeddingsProvider: ProviderType;
  viewEmbeddings: Embedding[];
  viewSimilarityMatrix: number[][] | null;
  mode: OperatingMode;
  setEmbeddings: (embeddings: Embedding[]) => void;
  calculateAgreementState: () => void;
}

export function useResponseEmbeddings({
  hasHydrated,
  completedResponses,
  embeddingsProvider,
  viewEmbeddings,
  viewSimilarityMatrix,
  mode,
  setEmbeddings,
  calculateAgreementState,
}: UseResponseEmbeddingsOptions): void {
  const embeddingFetchRef = useRef(false);
  const lastEmbeddingsProviderRef = useRef<ProviderType | null>(null);
  const failedEmbeddingsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasHydrated || completedResponses.length === 0) {
      return;
    }

    const providerChanged =
      lastEmbeddingsProviderRef.current !== embeddingsProvider;

    if (providerChanged) {
      failedEmbeddingsRef.current.clear();
    }

    const existingEmbeddings = providerChanged ? [] : viewEmbeddings;
    const pendingResponses = completedResponses.filter(
      (response) =>
        !existingEmbeddings.some(
          (embedding) => embedding.modelId === response.modelId,
        ) && !failedEmbeddingsRef.current.has(response.modelId),
    );

    if (!providerChanged && pendingResponses.length === 0) {
      if (viewEmbeddings.length >= 2 && !viewSimilarityMatrix) {
        calculateAgreementState();
      }
      return;
    }

    if (embeddingFetchRef.current) {
      return;
    }

    embeddingFetchRef.current = true;
    let cancelled = false;

    (async () => {
      const orderedEmbeddings = await generateEmbeddingsForResponses({
        responses: completedResponses,
        existingEmbeddings,
        provider: embeddingsProvider,
        mode: mode === 'pro' ? 'pro' : 'free',
        onError: (modelId, error: Error) => {
          logger.error(
            `Failed to generate embeddings for ${modelId} via ${embeddingsProvider}`,
            error,
          );
          failedEmbeddingsRef.current.add(modelId);
        },
      });

      if (cancelled) return;

      lastEmbeddingsProviderRef.current = embeddingsProvider;
      setEmbeddings(orderedEmbeddings);

      if (orderedEmbeddings.length >= 2) {
        calculateAgreementState();
      }
    })().catch((error: unknown) => {
      logger.error(
        'Failed to process embeddings',
        toError(error, 'Unable to process embeddings'),
      );
    })
      .finally(() => {
        embeddingFetchRef.current = false;
      });

    return () => {
      cancelled = true;
      embeddingFetchRef.current = false;
    };
  }, [
    calculateAgreementState,
    completedResponses,
    embeddingsProvider,
    hasHydrated,
    mode,
    setEmbeddings,
    viewEmbeddings,
    viewSimilarityMatrix,
  ]);
}
