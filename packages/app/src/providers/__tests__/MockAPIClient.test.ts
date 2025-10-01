/**
 * MockAPIClient Tests
 *
 * Unit tests for MockAPIClient streaming behavior
 */

/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi } from 'vitest';
import { MockAPIClient } from '../clients/MockAPIClient';

describe('MockAPIClient', () => {
  describe('streamResponse', () => {
    it('streams lorem ipsum in chunks', async () => {
      const client = new MockAPIClient();
      const chunks: string[] = [];
      let fullResponse = '';
      let responseTime = 0;

      await client.streamResponse(
        'Test prompt',
        'gpt-4o',
        (chunk) => chunks.push(chunk),
        (response, time) => {
          fullResponse = response;
          responseTime = time;
        },
        (error) => {
          throw error;
        }
      );

      // Verify chunks were received
      expect(chunks.length).toBeGreaterThan(10);

      // Verify full response matches concatenated chunks
      const concatenated = chunks.join('');
      expect(concatenated).toBe(fullResponse);

      // Verify word count is in expected range (750-1000 for gpt-4o)
      const wordCount = fullResponse.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(750);
      expect(wordCount).toBeLessThanOrEqual(1000);

      // Verify response time is reasonable (5-10 seconds)
      expect(responseTime).toBeGreaterThan(5000);
      expect(responseTime).toBeLessThan(12000);
    });

    it(
      'generates different responses for different models',
      async () => {
        const client = new MockAPIClient();
        const responses: Record<string, string> = {};

        const models = ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'grok-2'];

        for (const model of models) {
          await client.streamResponse(
            'Test prompt',
            model,
            () => {
              /* onChunk */
            },
            (response) => {
              responses[model] = response;
            },
            () => {
              /* onError */
            }
          );
        }

        // Verify all responses are different lengths
        const lengths = Object.values(responses).map((r) => r.length);
        expect(new Set(lengths).size).toBeGreaterThan(1);
      },
      { timeout: 50000 } // 50 seconds for 4 sequential streams
    );

    it('simulates errors when configured', async () => {
      const client = new MockAPIClient({
        enableErrors: true,
        errorProbability: 1.0, // Always error
      });

      let errorOccurred = false;
      let errorMessage = '';

      await client.streamResponse(
        'Test prompt',
        'gpt-4o',
        () => {},
        () => {
          throw new Error('Should not complete');
        },
        (error) => {
          errorOccurred = true;
          errorMessage = error.message;
        }
      );

      expect(errorOccurred).toBe(true);
      expect(errorMessage).toContain('Rate limit');
    });

    it('calls onChunk multiple times', async () => {
      const client = new MockAPIClient();
      const onChunk = vi.fn();

      await client.streamResponse(
        'Test prompt',
        'gpt-4o',
        onChunk,
        () => {},
        () => {}
      );

      expect(onChunk).toHaveBeenCalled();
      expect(onChunk.mock.calls.length).toBeGreaterThan(50);
    });

    it('chunks are 50-100 characters', async () => {
      const client = new MockAPIClient();
      const chunkSizes: number[] = [];

      await client.streamResponse(
        'Test prompt',
        'gpt-4o',
        (chunk) => chunkSizes.push(chunk.length),
        () => {},
        () => {}
      );

      // Verify most chunks are in range (last chunk might be smaller)
      const chunksInRange = chunkSizes.filter((size) => size >= 50 && size <= 100);
      expect(chunksInRange.length / chunkSizes.length).toBeGreaterThan(0.8);
    });
  });

  describe('generateEmbeddings', () => {
    it('returns 1536-dimensional vector', async () => {
      const client = new MockAPIClient();
      const embedding = await client.generateEmbeddings('Test text');

      expect(embedding).toHaveLength(1536);
    });

    it('returns deterministic embeddings for same text', async () => {
      const client = new MockAPIClient();
      const text = 'Lorem ipsum dolor sit amet';

      const embedding1 = await client.generateEmbeddings(text);
      const embedding2 = await client.generateEmbeddings(text);

      expect(embedding1).toEqual(embedding2);
    });

    it('returns different embeddings for different text', async () => {
      const client = new MockAPIClient();

      const embedding1 = await client.generateEmbeddings('Text one');
      const embedding2 = await client.generateEmbeddings('Text two');

      expect(embedding1).not.toEqual(embedding2);
    });

    it('embeddings are normalized to [0, 1]', async () => {
      const client = new MockAPIClient();
      const embedding = await client.generateEmbeddings('Test text');

      const allInRange = embedding.every((val) => val >= 0 && val <= 1);
      expect(allInRange).toBe(true);
    });
  });

  describe('validateApiKey', () => {
    it('always returns valid', async () => {
      const client = new MockAPIClient();
      const result = await client.validateApiKey('any-key');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('listAvailableModels', () => {
    it('returns 8 models', () => {
      const client = new MockAPIClient();
      const models = client.listAvailableModels();

      expect(models).toHaveLength(8);
    });

    it('includes all 4 providers', () => {
      const client = new MockAPIClient();
      const models = client.listAvailableModels();

      const providers = new Set(models.map((m) => m.provider));
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('google');
      expect(providers).toContain('xai');
    });

    it('all models have required metadata', () => {
      const client = new MockAPIClient();
      const models = client.listAvailableModels();

      models.forEach((model) => {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.provider).toBeTruthy();
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.costPer1kTokens).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
