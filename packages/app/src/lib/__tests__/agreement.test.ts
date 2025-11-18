import { describe, expect, it } from 'vitest';
import type { ModelResponse } from '~/store';
import {
  buildPairwiseComparisons,
  calculateAverageConfidence,
  normalizeSimilarity,
} from '../agreement';

describe('agreement utilities', () => {
  it('normalizes cosine similarity values to 0-1 range', () => {
    expect(normalizeSimilarity(-1)).toBe(0);
    expect(normalizeSimilarity(1)).toBe(1);
    expect(normalizeSimilarity(0)).toBe(0.5);
    expect(normalizeSimilarity(0.25)).toBeCloseTo(0.625);
  });

  it('builds pairwise comparisons matching the response order', () => {
    const responses: ModelResponse[] = [
      {
        modelId: 'model-1',
        provider: 'openai',
        model: 'GPT-4',
        response: 'Response A',
        isStreaming: false,
        isComplete: true,
        responseTime: 100,
        error: null,
        tokenCount: null,
      },
      {
        modelId: 'model-2',
        provider: 'anthropic',
        model: 'Claude 3',
        response: 'Response B',
        isStreaming: false,
        isComplete: true,
        responseTime: 120,
        error: null,
        tokenCount: null,
      },
      {
        modelId: 'model-3',
        provider: 'google',
        model: 'Gemini',
        response: 'Response C',
        isStreaming: false,
        isComplete: true,
        responseTime: 90,
        error: null,
        tokenCount: null,
      },
    ];

    const similarityMatrix = [
      [1, 0.2, 0.8],
      [0.2, 1, 0.4],
      [0.8, 0.4, 1],
    ];

    const comparisons = buildPairwiseComparisons(responses, similarityMatrix);

    expect(comparisons).toHaveLength(3);
    expect(comparisons[0]).toMatchObject({
      model1: 'GPT-4',
      model2: 'Claude 3',
    });
    expect(comparisons[1]).toMatchObject({
      model1: 'GPT-4',
      model2: 'Gemini',
    });
    expect(comparisons[2]).toMatchObject({
      model1: 'Claude 3',
      model2: 'Gemini',
    });

    comparisons.forEach((comparison) => {
      expect(comparison.similarity).toBeGreaterThanOrEqual(0);
      expect(comparison.similarity).toBeLessThanOrEqual(1);
      expect(comparison.confidence).toBe(comparison.similarity);
    });
  });

  it('returns an empty array when the matrix is missing or malformed', () => {
    const responses: ModelResponse[] = [
      {
        modelId: 'model-1',
        provider: 'openai',
        model: 'GPT-4',
        response: 'Response A',
        isStreaming: false,
        isComplete: true,
        responseTime: 100,
        error: null,
        tokenCount: null,
      },
      {
        modelId: 'model-2',
        provider: 'anthropic',
        model: 'Claude 3',
        response: 'Response B',
        isStreaming: false,
        isComplete: true,
        responseTime: 120,
        error: null,
        tokenCount: null,
      },
    ];

    expect(buildPairwiseComparisons(responses, null)).toEqual([]);

    const malformed = [
      [1, 0.5],
      [0.5],
      [0.5],
    ];

    expect(buildPairwiseComparisons(responses, malformed)).toEqual([]);
  });

  it('calculates average confidence across comparisons', () => {
    expect(calculateAverageConfidence([])).toBe(0);

    const average = calculateAverageConfidence([
      { model1: 'A', model2: 'B', similarity: 0.6, confidence: 0.7 },
      { model1: 'A', model2: 'C', similarity: 0.8, confidence: 0.9 },
    ]);

    expect(average).toBeCloseTo(0.8);
  });
});
