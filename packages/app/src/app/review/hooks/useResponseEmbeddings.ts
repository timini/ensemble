import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperatingMode } from '~/store/slices/modeSlice';
import { generateEmbeddingsForResponses } from '~/lib/embeddings';
import type { EmbeddingProvider } from '~/lib/embeddingsProvider';
import { toError } from '~/lib/errors';
import { logger } from '~/lib/logger';
import type { AgreementAnswer } from '~/lib/agreement';
type Embedding = { modelId: string; embedding: number[] };

/**
 * - `unavailable`: no embedding provider, so no agreement score can be given
 * - `pending`: embeddings are being generated or too few answers so far
 * - `ready`: at least two answers have embeddings
 * - `error`: the embeddings calls failed and fewer than two answers have one
 */
export type EmbeddingsStatus = 'unavailable' | 'pending' | 'ready' | 'error';

export interface UseResponseEmbeddingsResult {
  status: EmbeddingsStatus;
  /**
   * Answers whose embedding call failed. With status `ready` they are left
   * out of the agreement score.
   */
  failedModelIds: string[];
  /** Display names of completed answers that failed and have no embedding. */
  excludedModels: string[];
}

interface UseResponseEmbeddingsOptions {
  hasHydrated: boolean;
  /** Completed model answers and manual answers. */
  completedResponses: AgreementAnswer[];
  /** Resolved provider, or null when none is available. */
  embeddingsProvider: EmbeddingProvider | null;
  viewEmbeddings: Embedding[];
  /** Provider that produced `viewEmbeddings` (persisted with them). */
  viewEmbeddingsSource: string | null;
  viewSimilarityMatrix: number[][] | null;
  mode: OperatingMode;
  setEmbeddings: (embeddings: Embedding[], source: string | null) => void;
  calculateAgreementState: () => void;
}

export function useResponseEmbeddings({
  hasHydrated,
  completedResponses,
  embeddingsProvider,
  viewEmbeddings,
  viewEmbeddingsSource,
  viewSimilarityMatrix,
  mode,
  setEmbeddings,
  calculateAgreementState,
}: UseResponseEmbeddingsOptions): UseResponseEmbeddingsResult {
  const embeddingFetchRef = useRef(false);
  const lastEmbeddingsProviderRef = useRef<EmbeddingProvider | null>(null);
  const failedEmbeddingsRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<EmbeddingsStatus>('pending');
  const [failedModelIds, setFailedModelIds] = useState<string[]>([]);

  useEffect(() => {
    if (!hasHydrated || !embeddingsProvider || completedResponses.length === 0) {
      return;
    }

    // On a fresh mount the ref is empty, so fall back to the provider stored
    // with the persisted embeddings. Embeddings from the same provider are
    // reused instead of being requested (and billed) again.
    const lastProvider = lastEmbeddingsProviderRef.current ?? viewEmbeddingsSource;
    const providerChanged = lastProvider !== embeddingsProvider;

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
      lastEmbeddingsProviderRef.current = embeddingsProvider;
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
      setEmbeddings(orderedEmbeddings, embeddingsProvider);
      setFailedModelIds(Array.from(failedEmbeddingsRef.current));

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
      setFailedModelIds(Array.from(failedEmbeddingsRef.current));
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
    viewEmbeddingsSource,
    viewSimilarityMatrix,
  ]);

  const excludedModels = useMemo(() => {
    const embedded = new Set(viewEmbeddings.map((entry) => entry.modelId));
    return completedResponses
      .filter((r) => failedModelIds.includes(r.modelId) && !embedded.has(r.modelId))
      .map((r) => r.model);
  }, [completedResponses, failedModelIds, viewEmbeddings]);

  return {
    status: embeddingsProvider ? status : 'unavailable',
    failedModelIds,
    excludedModels,
  };
}
