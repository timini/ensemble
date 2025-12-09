import type { PairwiseComparison } from '@/components/organisms/AgreementAnalysis';
import type { ModelResponse } from '~/store';

import { normalizeSimilarity } from '@ensemble-ai/shared-utils/similarity';

// Re-export for use by consumers
export { normalizeSimilarity };

/**
 * Build pairwise comparisons from the similarity matrix while preserving
 * model ordering from the response list.
 */
export function buildPairwiseComparisons(
  responses: ModelResponse[],
  similarityMatrix: number[][] | null,
): PairwiseComparison[] {
  if (!similarityMatrix) return [];
  const responseCount = responses.length;

  // Validate matrix dimensions (square matrix with matching response count)
  if (
    similarityMatrix.length !== responseCount ||
    similarityMatrix.some((row) => row.length !== responseCount)
  ) {
    return [];
  }

  const comparisons: PairwiseComparison[] = [];

  for (let i = 0; i < responseCount; i++) {
    for (let j = i + 1; j < responseCount; j++) {
      const similarity = similarityMatrix[i]?.[j];
      if (typeof similarity !== 'number') continue;
      const normalized = normalizeSimilarity(similarity);

      comparisons.push({
        model1: responses[i]!.model,
        model2: responses[j]!.model,
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
