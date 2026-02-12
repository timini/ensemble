import { describe, it, expect } from 'vitest';
import { FreeGoogleClient } from '../clients/google/FreeGoogleClient.js';
import { FreeOpenAIClient } from '../clients/openai/FreeOpenAIClient.js';
import { FreeAnthropicClient } from '../clients/anthropic/FreeAnthropicClient.js';
import { FreeXAIClient } from '../clients/xai/FreeXAIClient.js';

const googleKey = process.env.NEXT_PUBLIC_GOOGLE_TEST_KEY ?? process.env.GOOGLE_API_KEY;
const openAiKey = process.env.NEXT_PUBLIC_OPENAI_TEST_KEY ?? process.env.OPENAI_API_KEY;
const anthropicKey =
  process.env.NEXT_PUBLIC_ANTHROPIC_TEST_KEY ?? process.env.ANTHROPIC_API_KEY;
const xaiKey = process.env.NEXT_PUBLIC_XAI_TEST_KEY ?? process.env.XAI_API_KEY;

const describeIf = (condition: unknown) => (condition ? describe : describe.skip);

describeIf(Boolean(googleKey))('Google Free client integration', () => {
  it(
    'validates a real API key',
    async () => {
      const client = new FreeGoogleClient('google', () => googleKey!);
      const result = await client.validateApiKey(googleKey!);
      expect(result.valid).toBe(true);
    },
    20_000,
  );

  it(
    'rejects an invalid API key',
    async () => {
      const client = new FreeGoogleClient('google', () => 'invalid-key');
      const result = await client.validateApiKey('invalid-key');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    },
    20_000,
  );

  it(
    'lists models from the live API',
    async () => {
      const client = new FreeGoogleClient('google', () => googleKey!);
      const models = await client.listAvailableTextModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((model) => model.toLowerCase().includes('gemini'))).toBe(true);
    },
    20_000,
  );
});

describeIf(Boolean(openAiKey))('OpenAI Free client integration', () => {
  it(
    'validates a real API key',
    async () => {
      const client = new FreeOpenAIClient('openai', () => openAiKey!);
      const result = await client.validateApiKey(openAiKey!);
      expect(result.valid).toBe(true);
    },
    20_000,
  );

  it(
    'rejects an invalid API key',
    async () => {
      const client = new FreeOpenAIClient('openai', () => 'sk-invalid');
      const result = await client.validateApiKey('sk-invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    },
    20_000,
  );

  it(
    'lists models from the live API',
    async () => {
      const client = new FreeOpenAIClient('openai', () => openAiKey!);
      const models = await client.listAvailableTextModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((model) => model.toLowerCase().includes('gpt'))).toBe(true);
    },
    20_000,
  );
});

describeIf(Boolean(anthropicKey))('Anthropic Free client integration', () => {
  it(
    'validates a real API key',
    async () => {
      const client = new FreeAnthropicClient('anthropic', () => anthropicKey!);
      const result = await client.validateApiKey(anthropicKey!);
      expect(result.valid).toBe(true);
    },
    20_000,
  );

  it(
    'rejects an invalid API key',
    async () => {
      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant-invalid');
      const result = await client.validateApiKey('sk-ant-invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    },
    20_000,
  );

  it(
    'lists models from the live API',
    async () => {
      const client = new FreeAnthropicClient('anthropic', () => anthropicKey!);
      const models = await client.listAvailableTextModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((model) => model.toLowerCase().includes('claude'))).toBe(true);
    },
    20_000,
  );
});

describeIf(Boolean(xaiKey))('xAI Free client integration', () => {
  it(
    'validates a real API key',
    async () => {
      const client = new FreeXAIClient('xai', () => xaiKey!);
      const result = await client.validateApiKey(xaiKey!);
      expect(result.valid).toBe(true);
    },
    20_000,
  );

  it(
    'rejects an invalid API key',
    async () => {
      const client = new FreeXAIClient('xai', () => 'xai-invalid');
      const result = await client.validateApiKey('xai-invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    },
    20_000,
  );

  it(
    'lists models from the live API',
    async () => {
      const client = new FreeXAIClient('xai', () => xaiKey!);
      const models = await client.listAvailableTextModels();
      expect(models.length).toBeGreaterThan(0);
    },
    20_000,
  );
});
