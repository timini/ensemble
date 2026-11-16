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
 * Returns completedResponses, pairwiseComparisons, overallAgreement, and averageConfidence.
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

  const averageConfidence = useMemo(
    () => calculateAverageConfidence(pairwiseComparisons),
    [pairwiseComparisons],
  );

  return {
    completedResponses,
    pairwiseComparisons,
    overallAgreement,
    averageConfidence,
  };
}
