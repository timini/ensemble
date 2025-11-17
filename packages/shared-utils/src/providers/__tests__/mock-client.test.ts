import { describe, expect, it } from 'vitest';
import { MockProviderClient } from '../clients/mock/MockProviderClient.js';

describe('MockProviderClient', () => {
  it('streams lorem ipsum content', async () => {
    const client = new MockProviderClient();
    const chunks: string[] = [];

    await client.streamResponse(
      'hello world',
      'gpt-4o',
      (chunk) => chunks.push(chunk),
      () => {},
      () => {},
    );

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('').length).toBeGreaterThan(100);
  }, 15000);

  it('returns deterministic embeddings length', async () => {
    const client = new MockProviderClient();
    const embedding = await client.generateEmbeddings('deterministic');
    expect(embedding).toHaveLength(1536);
  });

  it('always validates mock API keys', async () => {
    const client = new MockProviderClient();
    const result = await client.validateApiKey('anything');
    expect(result.valid).toBe(true);
  });

  it('lists available text models', async () => {
    const client = new MockProviderClient();
    const textModels = await client.listAvailableTextModels();
    expect(textModels.length).toBeGreaterThan(0);
  });
});
