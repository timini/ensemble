import { useEffect, useRef } from 'react';
import type { ProviderType } from '~/store/slices/ensembleSlice';
import type { OperatingMode } from '~/store/slices/modeSlice';
import { generateEmbeddingsForResponses } from '~/lib/embeddings';
import { toError } from '~/lib/errors';
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

  useEffect(() => {
    if (!hasHydrated || completedResponses.length === 0) {
      return;
    }

    const providerChanged =
      lastEmbeddingsProviderRef.current !== embeddingsProvider;
    const existingEmbeddings = providerChanged ? [] : viewEmbeddings;
    const pendingResponses = completedResponses.filter(
      (response) =>
        !existingEmbeddings.some(
          (embedding) => embedding.modelId === response.modelId,
        ),
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
          console.error(
            `Failed to generate embeddings for ${modelId} via ${embeddingsProvider}`,
            error,
          );
        },
      });

      if (cancelled) return;

      lastEmbeddingsProviderRef.current = embeddingsProvider;
      setEmbeddings(orderedEmbeddings);

      if (orderedEmbeddings.length >= 2) {
        calculateAgreementState();
      }
    })().catch((error: unknown) => {
      console.error(
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
