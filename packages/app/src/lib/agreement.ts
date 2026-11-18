import type { PairwiseComparison } from "@/components/organisms/AgreementAnalysis";
import type { ManualResponse, ModelResponse } from "~/store";

import { normalizeSimilarity } from "@ensemble-ai/shared-utils/similarity";

// Re-export for use by consumers
export { normalizeSimilarity };

/**
 * An answer the agreement analysis scores: a completed model answer or a
 * manual answer. `model` is the name shown in the comparisons.
 */
export type AgreementAnswer = Pick<
  ModelResponse,
  "modelId" | "model" | "response" | "isComplete" | "error"
>;

/** A manual answer in the shape the agreement analysis scores. */
export function manualAgreementAnswer(manual: ManualResponse): AgreementAnswer {
  return {
    modelId: manual.id,
    model: manual.label,
    response: manual.response,
    isComplete: true,
    error: null,
  };
}

/**
 * Build pairwise comparisons from the similarity matrix.
 *
 * Row and column `i` of the matrix belong to `embeddedModelIds[i]` (the order
 * of the stored embeddings). It defaults to every response, in order. When
 * some embeddings failed the matrix covers fewer answers than `responses`,
 * and only the embedded answers are compared.
 */
export function buildPairwiseComparisons(
  responses: AgreementAnswer[],
  similarityMatrix: number[][] | null,
  embeddedModelIds: string[] = responses.map((response) => response.modelId),
): PairwiseComparison[] {
  if (!similarityMatrix) return [];
  const size = embeddedModelIds.length;

  // Square matrix with one row per embedded answer
  if (
    similarityMatrix.length !== size ||
    similarityMatrix.some((row) => row.length !== size)
  ) {
    return [];
  }

  const byId = new Map(
    responses.map((response) => [response.modelId, response]),
  );
  const comparisons: PairwiseComparison[] = [];

  for (let i = 0; i < size; i++) {
    const first = byId.get(embeddedModelIds[i]!);
    if (!first) continue;
    for (let j = i + 1; j < size; j++) {
      const second = byId.get(embeddedModelIds[j]!);
      const similarity = similarityMatrix[i]?.[j];
      if (!second || typeof similarity !== "number") continue;
      const normalized = normalizeSimilarity(similarity);

      comparisons.push({
        model1: first.model,
        model2: second.model,
        similarity: normalized,
        confidence: normalized,
      });
    }
  }

  return comparisons;
}

/**
 * Calculate the average confidence score across pairwise comparisons.
 */
export function calculateAverageConfidence(
  comparisons: PairwiseComparison[],
): number {
  if (comparisons.length === 0) return 0;
  const total = comparisons.reduce(
    (sum, comparison) => sum + comparison.confidence,
    0,
  );
  return total / comparisons.length;
}
