import { describe, expect, it } from 'vitest';
import { FreeXAIClient } from '@ensemble-ai/shared-utils/providers';

const apiKey = process.env.NEXT_PUBLIC_XAI_TEST_KEY;
const describeIfKey = apiKey ? describe : describe.skip;

describeIfKey('XAI Free provider integration', () => {
  it(
    'validates configured API key with the live API',
    async () => {
      const client = new FreeXAIClient('xai', () => apiKey!);
      const result = await client.validateApiKey(apiKey!);
      expect(result.valid).toBe(true);
    },
    20000,
  );
});
