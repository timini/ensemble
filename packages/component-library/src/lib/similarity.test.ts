import { describe, it, expect } from 'vitest';
import { cosineSimilarity, similarityMatrix, agreementStatistics } from './similarity';

describe('cosineSimilarity', () => {
  describe('edge cases', () => {
    it('returns 1.0 for identical vectors', () => {
      const vectorA = [1, 2, 3, 4, 5];
      const vectorB = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vectorA, vectorB)).toBe(1.0);
    });

    it('returns 0.0 for orthogonal vectors', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      expect(cosineSimilarity(vectorA, vectorB)).toBe(0.0);
    });

    it('returns -1.0 for opposite vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [-1, -2, -3];
      expect(cosineSimilarity(vectorA, vectorB)).toBeCloseTo(-1.0, 10);
    });

    it('throws error for empty vectors', () => {
      expect(() => cosineSimilarity([], [])).toThrow('Vectors cannot be empty');
    });

    it('throws error for vectors with different lengths', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
        'Vector dimensions must match'
      );
    });

    it('throws error for zero-magnitude vectors', () => {
      const zeroVector = [0, 0, 0];
      const normalVector = [1, 2, 3];
      expect(() => cosineSimilarity(zeroVector, normalVector)).toThrow(
        'Cannot calculate similarity for zero-magnitude vectors'
      );
    });
  });

  describe('normal cases', () => {
    it('calculates correct similarity for similar vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [2, 3, 4];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeGreaterThan(0.9); // Highly similar
      expect(similarity).toBeLessThan(1.0); // Not identical
    });

    it('calculates correct similarity for dissimilar vectors', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 0, 1];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0.0); // Orthogonal
    });

    it('handles high-dimensional vectors', () => {
      const vectorA = Array.from({ length: 1536 }, (_, i) => i / 1536);
      const vectorB = Array.from({ length: 1536 }, (_, i) => (i + 1) / 1536);
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('returns value between -1 and 1', () => {
      const vectorA = [3.5, -2.1, 4.7];
      const vectorB = [1.2, 5.8, -3.3];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });
});

describe('similarityMatrix', () => {
  it('creates correct size matrix', () => {
    const vectors = [
      [1, 2],
      [2, 3],
      [3, 4],
    ];
    const matrix = similarityMatrix(vectors);
    expect(matrix).toHaveLength(3);
    expect(matrix[0]).toHaveLength(3);
  });

  it('has 1.0 on diagonal (self-similarity)', () => {
    const vectors = [
      [1, 2],
      [2, 3],
      [3, 4],
    ];
    const matrix = similarityMatrix(vectors);
    expect(matrix[0]![0]).toBe(1.0);
    expect(matrix[1]![1]).toBe(1.0);
    expect(matrix[2]![2]).toBe(1.0);
  });

  it('is symmetric (matrix[i][j] === matrix[j][i])', () => {
    const vectors = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    const matrix = similarityMatrix(vectors);
    expect(matrix[0]![1]).toBeCloseTo(matrix[1]![0]!, 10);
    expect(matrix[0]![2]).toBeCloseTo(matrix[2]![0]!, 10);
    expect(matrix[1]![2]).toBeCloseTo(matrix[2]![1]!, 10);
  });

  it('calculates correct pairwise similarities', () => {
    const vectors = [
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ];
    const matrix = similarityMatrix(vectors);

    // Orthogonal vectors
    expect(matrix[0]![1]).toBe(0.0);

    // 45-degree angle vectors
    expect(matrix[0]![2]).toBeCloseTo(0.707, 3);
    expect(matrix[1]![2]).toBeCloseTo(0.707, 3);
  });
});

describe('agreementStatistics', () => {
  it('throws error for empty array', () => {
    expect(() => agreementStatistics([])).toThrow(
      'Cannot calculate statistics for empty array'
    );
  });

  it('calculates correct mean', () => {
    const similarities = [0.5, 0.7, 0.9];
    const stats = agreementStatistics(similarities);
    expect(stats.mean).toBeCloseTo(0.7, 10);
  });

  it('calculates correct median for odd-length array', () => {
    const similarities = [0.5, 0.7, 0.9];
    const stats = agreementStatistics(similarities);
    expect(stats.median).toBe(0.7);
  });

  it('calculates correct median for even-length array', () => {
    const similarities = [0.5, 0.6, 0.8, 0.9];
    const stats = agreementStatistics(similarities);
    expect(stats.median).toBe(0.7); // (0.6 + 0.8) / 2
  });

  it('calculates correct min and max', () => {
    const similarities = [0.5, 0.7, 0.9, 0.3, 1.0];
    const stats = agreementStatistics(similarities);
    expect(stats.min).toBe(0.3);
    expect(stats.max).toBe(1.0);
  });

  it('calculates correct standard deviation', () => {
    const similarities = [0.5, 0.7, 0.9];
    const stats = agreementStatistics(similarities);
    // Manual calculation: variance = ((0.5-0.7)^2 + (0.7-0.7)^2 + (0.9-0.7)^2) / 3 = 0.0267
    // stddev = sqrt(0.0267) = 0.163
    expect(stats.stddev).toBeCloseTo(0.163, 3);
  });

  it('handles single value', () => {
    const similarities = [0.75];
    const stats = agreementStatistics(similarities);
    expect(stats.mean).toBe(0.75);
    expect(stats.median).toBe(0.75);
    expect(stats.min).toBe(0.75);
    expect(stats.max).toBe(0.75);
    expect(stats.stddev).toBe(0);
  });

  it('handles identical values', () => {
    const similarities = [0.8, 0.8, 0.8, 0.8];
    const stats = agreementStatistics(similarities);
    expect(stats.mean).toBe(0.8);
    expect(stats.median).toBe(0.8);
    expect(stats.min).toBe(0.8);
    expect(stats.max).toBe(0.8);
    expect(stats.stddev).toBe(0);
  });
});
