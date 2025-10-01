/**
 * Similarity calculation utilities for agreement analysis
 *
 * This module provides cosine similarity calculation for comparing
 * text embeddings from different AI model responses.
 */

/**
 * Calculate cosine similarity between two vectors
 *
 * Cosine similarity measures the cosine of the angle between two vectors
 * in n-dimensional space. Returns a value between -1 and 1:
 * - 1: Vectors are identical (parallel, same direction)
 * - 0: Vectors are orthogonal (perpendicular)
 * - -1: Vectors are opposite (parallel, opposite direction)
 *
 * @param vectorA - First embedding vector
 * @param vectorB - Second embedding vector
 * @returns Cosine similarity score between -1 and 1
 * @throws Error if vectors have different lengths or are empty
 *
 * @example
 * ```ts
 * const similarity = cosineSimilarity([1, 2, 3], [4, 5, 6]);
 * console.log(similarity); // 0.974
 * ```
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length === 0 || vectorB.length === 0) {
    throw new Error('Vectors cannot be empty');
  }

  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Vector dimensions must match: ${vectorA.length} !== ${vectorB.length}`
    );
  }

  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i]! * vectorB[i]!;
  }

  // Calculate magnitudes
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vectorA.length; i++) {
    magnitudeA += vectorA[i]! * vectorA[i]!;
    magnitudeB += vectorB[i]! * vectorB[i]!;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Handle zero magnitude vectors
  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error('Cannot calculate similarity for zero-magnitude vectors');
  }

  // Calculate cosine similarity
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate pairwise similarity matrix for multiple vectors
 *
 * @param vectors - Array of embedding vectors to compare
 * @returns 2D matrix where matrix[i][j] is similarity between vectors i and j
 *
 * @example
 * ```ts
 * const vectors = [[1, 2], [2, 3], [3, 4]];
 * const matrix = similarityMatrix(vectors);
 * // matrix[0][1] is similarity between first and second vector
 * ```
 */
export function similarityMatrix(vectors: number[][]): number[][] {
  const n = vectors.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i]![j] = 1.0; // Self-similarity is always 1
      } else {
        matrix[i]![j] = cosineSimilarity(vectors[i]!, vectors[j]!);
      }
    }
  }

  return matrix;
}

/**
 * Calculate agreement statistics from similarity scores
 *
 * @param similarities - Array of similarity scores
 * @returns Statistics object with mean, median, min, max, and stddev
 */
export function agreementStatistics(similarities: number[]): {
  mean: number;
  median: number;
  min: number;
  max: number;
  stddev: number;
} {
  if (similarities.length === 0) {
    throw new Error('Cannot calculate statistics for empty array');
  }

  const sorted = [...similarities].sort((a, b) => a - b);
  const sum = similarities.reduce((acc, val) => acc + val, 0);
  const mean = sum / similarities.length;

  const median =
    similarities.length % 2 === 0
      ? (sorted[similarities.length / 2 - 1]! + sorted[similarities.length / 2]!) / 2
      : sorted[Math.floor(similarities.length / 2)]!;

  const variance =
    similarities.reduce((acc, val) => acc + (val - mean) ** 2, 0) / similarities.length;
  const stddev = Math.sqrt(variance);

  return {
    mean,
    median,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    stddev,
  };
}
