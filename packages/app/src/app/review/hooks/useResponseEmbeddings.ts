import { useEffect, useRef, useState } from 'react';
import type { OperatingMode } from '~/store/slices/modeSlice';
import { generateEmbeddingsForResponses } from '~/lib/embeddings';
import type { EmbeddingProvider } from '~/lib/embeddingsProvider';
import { toError } from '~/lib/errors';
import { logger } from '~/lib/logger';
import type { ModelResponse } from '~/store';
type Embedding = { modelId: string; embedding: number[] };

/**
 * - `unavailable`: no embedding provider, so no agreement score can be given
 * - `pending`: embeddings are being generated or too few answers so far
 * - `ready`: at least two answers have embeddings
 * - `error`: the embeddings calls failed and fewer than two answers have one
 */
export type EmbeddingsStatus = 'unavailable' | 'pending' | 'ready' | 'error';

interface UseResponseEmbeddingsOptions {
  hasHydrated: boolean;
  completedResponses: ModelResponse[];
  /** Resolved provider, or null when none is available. */
  embeddingsProvider: EmbeddingProvider | null;
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
}: UseResponseEmbeddingsOptions): { status: EmbeddingsStatus } {
  const embeddingFetchRef = useRef(false);
  const lastEmbeddingsProviderRef = useRef<EmbeddingProvider | null>(null);
  const failedEmbeddingsRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<EmbeddingsStatus>('pending');

  useEffect(() => {
    if (!hasHydrated || !embeddingsProvider || completedResponses.length === 0) {
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
      if (viewEmbeddings.length >= 2) {
        setStatus('ready');
        if (!viewSimilarityMatrix) calculateAgreementState();
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
        setStatus('ready');
        calculateAgreementState();
      } else {
        setStatus(failedEmbeddingsRef.current.size > 0 ? 'error' : 'pending');
      }
    })().catch((error: unknown) => {
      logger.error(
        'Failed to process embeddings',
        toError(error, 'Unable to process embeddings'),
      );
      if (cancelled) return;
      lastEmbeddingsProviderRef.current = embeddingsProvider;
      completedResponses.forEach((r) => failedEmbeddingsRef.current.add(r.modelId));
      setStatus('error');
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

  return { status: embeddingsProvider ? status : 'unavailable' };
}
