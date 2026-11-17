import { useMemo } from "react";
import {
  buildPairwiseComparisons,
  calculateAverageConfidence,
  normalizeSimilarity,
} from "~/lib/agreement";
import type { ModelResponse, AgreementStats } from "~/store";

type Embedding = { modelId: string; embedding: number[] };

/**
 * Derives analytics values from completed responses and agreement data.
 * Returns completedResponses (successful answers), pairwiseComparisons,
 * overallAgreement, averageConfidence, failedModels and allFinished.
 */
export function useReviewAnalytics(
  viewResponses: ModelResponse[],
  viewAgreementStats: AgreementStats | null,
  viewSimilarityMatrix: number[][] | null,
  viewEmbeddings: Embedding[],
) {
  const completedResponses = useMemo(
    () =>
      viewResponses.filter(
        (response) =>
          response.isComplete &&
          !response.error &&
          response.response.trim().length > 0,
      ),
    [viewResponses],
  );

  // The matrix follows the order of the stored embeddings, which can cover
  // fewer answers than completedResponses when some embedding calls failed.
  const pairwiseComparisons = useMemo(
    () =>
      buildPairwiseComparisons(
        completedResponses,
        viewSimilarityMatrix,
        viewEmbeddings.map((entry) => entry.modelId),
      ),
    [completedResponses, viewSimilarityMatrix, viewEmbeddings],
  );

  const overallAgreement = useMemo(
    () =>
      viewAgreementStats ? normalizeSimilarity(viewAgreementStats.mean) : 0,
    [viewAgreementStats],
  );

  // Models whose answer failed (any error kind, including interrupted).
  const failedModels = useMemo(
    () => viewResponses.filter((r) => r.error).map((r) => r.model),
    [viewResponses],
  );

  const allFinished = useMemo(
    () => viewResponses.every((r) => !r.isStreaming),
    [viewResponses],
  );

  const averageConfidence = useMemo(
    () => calculateAverageConfidence(pairwiseComparisons),
    [pairwiseComparisons],
  );

  return {
    completedResponses,
    pairwiseComparisons,
    overallAgreement,
    averageConfidence,
    failedModels,
    allFinished,
  };
}
