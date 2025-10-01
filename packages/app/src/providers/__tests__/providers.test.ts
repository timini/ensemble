/**
 * Provider Implementations Tests
 *
 * Integration tests for all 4 provider implementations
 */

/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '../implementations/OpenAIProvider';
import { AnthropicProvider } from '../implementations/AnthropicProvider';
import { GoogleProvider } from '../implementations/GoogleProvider';
import { XAIProvider } from '../implementations/XAIProvider';

describe('Provider Implementations', () => {
  describe('OpenAIProvider', () => {
    it('lists only OpenAI models', () => {
      const provider = new OpenAIProvider();
      const models = provider.listAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.provider).toBe('openai');
      });
    });

    it('streams lorem ipsum response', async () => {
      const provider = new OpenAIProvider();
      const chunks: string[] = [];
      let fullResponse = '';

      await provider.streamResponse(
        'Test prompt',
        'gpt-4o',
        (chunk) => chunks.push(chunk),
        (response) => {
          fullResponse = response;
        },
        () => {}
      );

      expect(chunks.length).toBeGreaterThan(0);
      expect(fullResponse.length).toBeGreaterThan(0);
    });

    it('generates embeddings', async () => {
      const provider = new OpenAIProvider();
      const embedding = await provider.generateEmbeddings('Test text');

      expect(embedding).toHaveLength(1536);
    });

    it('validates API keys', async () => {
      const provider = new OpenAIProvider();
      const result = await provider.validateApiKey('test-key');

      expect(result.valid).toBe(true);
    });
  });

  describe('AnthropicProvider', () => {
    it('lists only Anthropic models', () => {
      const provider = new AnthropicProvider();
      const models = provider.listAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.provider).toBe('anthropic');
      });
    });

    it('streams lorem ipsum response', async () => {
      const provider = new AnthropicProvider();
      const chunks: string[] = [];
      let fullResponse = '';

      await provider.streamResponse(
        'Test prompt',
        'claude-3-5-sonnet',
        (chunk) => chunks.push(chunk),
        (response) => {
          fullResponse = response;
        },
        () => {}
      );

      expect(chunks.length).toBeGreaterThan(0);
      expect(fullResponse.length).toBeGreaterThan(0);
    });

    it('generates embeddings', async () => {
      const provider = new AnthropicProvider();
      const embedding = await provider.generateEmbeddings('Test text');

      expect(embedding).toHaveLength(1536);
    });

    it('validates API keys', async () => {
      const provider = new AnthropicProvider();
      const result = await provider.validateApiKey('test-key');

      expect(result.valid).toBe(true);
    });
  });

  describe('GoogleProvider', () => {
    it('lists only Google models', () => {
      const provider = new GoogleProvider();
      const models = provider.listAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.provider).toBe('google');
      });
    });

    it('streams lorem ipsum response', async () => {
      const provider = new GoogleProvider();
      const chunks: string[] = [];
      let fullResponse = '';

      await provider.streamResponse(
        'Test prompt',
        'gemini-1.5-pro',
        (chunk) => chunks.push(chunk),
        (response) => {
          fullResponse = response;
        },
        () => {}
      );

      expect(chunks.length).toBeGreaterThan(0);
      expect(fullResponse.length).toBeGreaterThan(0);
    });

    it('generates embeddings', async () => {
      const provider = new GoogleProvider();
      const embedding = await provider.generateEmbeddings('Test text');

      expect(embedding).toHaveLength(1536);
    });

    it('validates API keys', async () => {
      const provider = new GoogleProvider();
      const result = await provider.validateApiKey('test-key');

      expect(result.valid).toBe(true);
    });
  });

  describe('XAIProvider', () => {
    it('lists only XAI models', () => {
      const provider = new XAIProvider();
      const models = provider.listAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.provider).toBe('xai');
      });
    });

    it('streams lorem ipsum response', async () => {
      const provider = new XAIProvider();
      const chunks: string[] = [];
      let fullResponse = '';

      await provider.streamResponse(
        'Test prompt',
        'grok-2',
        (chunk) => chunks.push(chunk),
        (response) => {
          fullResponse = response;
        },
        () => {}
      );

      expect(chunks.length).toBeGreaterThan(0);
      expect(fullResponse.length).toBeGreaterThan(0);
    });

    it('generates embeddings', async () => {
      const provider = new XAIProvider();
      const embedding = await provider.generateEmbeddings('Test text');

      expect(embedding).toHaveLength(1536);
    });

    it('validates API keys', async () => {
      const provider = new XAIProvider();
      const result = await provider.validateApiKey('test-key');

      expect(result.valid).toBe(true);
    });
  });

  describe('All Providers', () => {
    it('all implement AIProvider interface', () => {
      const providers = [
        new OpenAIProvider(),
        new AnthropicProvider(),
        new GoogleProvider(),
        new XAIProvider(),
      ];

      providers.forEach((provider) => {
        expect(typeof provider.streamResponse).toBe('function');
        expect(typeof provider.generateEmbeddings).toBe('function');
        expect(typeof provider.validateApiKey).toBe('function');
        expect(typeof provider.listAvailableModels).toBe('function');
      });
    });

    it('all return 8 total models combined', () => {
      const providers = [
        new OpenAIProvider(),
        new AnthropicProvider(),
        new GoogleProvider(),
        new XAIProvider(),
      ];

      const allModels = providers.flatMap((p) => p.listAvailableModels());
      expect(allModels).toHaveLength(8);
    });
  });
});
