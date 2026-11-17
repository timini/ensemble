import {
  agreementStatistics,
  similarityMatrix as buildSimilarityMatrix,
} from "@ensemble-ai/shared-utils/similarity";
import { toError } from "~/lib/errors";
import { logger } from "~/lib/logger";
import type { AgreementStats } from "./responseTypes";

/**
 * Similarity matrix and agreement statistics for the stored embeddings, as
 * the response slice keeps them. Both are null with fewer than 2 embeddings
 * or when the vectors cannot be compared.
 */
export function agreementFromEmbeddings(
  embeddings: Array<{ embedding: number[] }>,
): {
  similarityMatrix: number[][] | null;
  agreementStats: AgreementStats | null;
} {
  if (embeddings.length < 2) {
    return { similarityMatrix: null, agreementStats: null };
  }

  try {
    const matrix = buildSimilarityMatrix(
      embeddings.map((entry) => entry.embedding),
    );
    return {
      similarityMatrix: matrix,
      agreementStats: agreementStatistics(upperTriangle(matrix)),
    };
  } catch (error: unknown) {
    // Mismatched or zero vectors cannot be compared. Show no score rather
    // than a wrong one.
    logger.error("Unable to calculate agreement", toError(error));
    return { similarityMatrix: null, agreementStats: null };
  }
}

/** Pairwise values above the diagonal of a square matrix. */
function upperTriangle(matrix: number[][]): number[] {
  const values: number[] = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      values.push(matrix[i]![j]!);
    }
  }
  return values;
}
