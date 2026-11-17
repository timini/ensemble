import { useMemo } from "react";
import {
  buildPairwiseComparisons,
  calculateAverageConfidence,
  manualAgreementAnswer,
  normalizeSimilarity,
} from "~/lib/agreement";
import type { ModelResponse, ManualResponse, AgreementStats } from "~/store";

type Embedding = { modelId: string; embedding: number[] };

/**
 * Derives analytics values from completed responses and agreement data.
 * Returns completedResponses (successful model answers), agreementAnswers
 * (those plus the manual answers, which the agreement analysis scores too),
 * pairwiseComparisons, overallAgreement, averageConfidence, failedModels and
 * allFinished.
 */
export function useRunAnalytics(
  viewResponses: ModelResponse[],
  viewManualResponses: ManualResponse[],
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

  const agreementAnswers = useMemo(
    () => [
      ...completedResponses,
      ...viewManualResponses
        .filter((manual) => manual.response.trim().length > 0)
        .map(manualAgreementAnswer),
    ],
    [completedResponses, viewManualResponses],
  );

  // The matrix follows the order of the stored embeddings, which can cover
  // fewer answers than agreementAnswers when some embedding calls failed.
  const pairwiseComparisons = useMemo(
    () =>
      buildPairwiseComparisons(
        agreementAnswers,
        viewSimilarityMatrix,
        viewEmbeddings.map((entry) => entry.modelId),
      ),
    [agreementAnswers, viewSimilarityMatrix, viewEmbeddings],
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
    agreementAnswers,
    pairwiseComparisons,
    overallAgreement,
    averageConfidence,
    failedModels,
    allFinished,
  };
}
