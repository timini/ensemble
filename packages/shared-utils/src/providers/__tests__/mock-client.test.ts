import { describe, expect, it, vi } from 'vitest';
import { MockProviderClient } from '../clients/mock/MockProviderClient.js';

describe('MockProviderClient', () => {
  it('streams lorem ipsum content', async () => {
    const client = new MockProviderClient();
    const chunks: string[] = [];

    const handleComplete = vi.fn();
    const handleError = vi.fn();

    await client.streamResponse(
      'hello world',
      'gpt-4o',
      (chunk) => chunks.push(chunk),
      handleComplete,
      handleError,
    );

    expect(handleComplete).toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
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

  it('returns one short answer per response label for the final_answers schema', async () => {
    const client = new MockProviderClient();
    const schema = {
      name: 'final_answers',
      schema: { type: 'object', properties: { answers: { type: 'array' } } },
    };
    const prompt = 'Responses:\n[R1]\nfoo\n\n---\n\n[R2]\nbar\n\n---\n\n[R3]\nbaz';

    const result = await client.generateStructured<{ answers: { id: string; kind: string; answer: string }[] }>(
      prompt,
      'gpt-4o',
      schema,
    );

    expect(result.parsed.answers.map((a) => a.id)).toEqual(['R1', 'R2', 'R3']);
    expect(result.parsed.answers.every((a) => a.kind === 'number')).toBe(true);
    // Most labels agree so a mock majority run reaches a vote winner.
    expect(result.parsed.answers.map((a) => a.answer)).toEqual(['42', '42', '41']);
  });
});
