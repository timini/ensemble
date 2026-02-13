import { useMemo } from "react";
import {
  buildPairwiseComparisons,
  calculateAverageConfidence,
  normalizeSimilarity,
} from "~/lib/agreement";
import type { ModelResponse, AgreementStats } from "~/store";

/**
 * Derives analytics values from completed responses and agreement data.
 * Returns completedResponses, pairwiseComparisons, overallAgreement, and averageConfidence.
 */
export function useReviewAnalytics(
  viewResponses: ModelResponse[],
  viewAgreementStats: AgreementStats | null,
  viewSimilarityMatrix: number[][] | null,
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

  const pairwiseComparisons = useMemo(
    () => buildPairwiseComparisons(completedResponses, viewSimilarityMatrix),
    [completedResponses, viewSimilarityMatrix],
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
