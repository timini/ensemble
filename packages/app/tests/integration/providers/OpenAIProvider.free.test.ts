import { describe, expect, it } from 'vitest';
import { FreeOpenAIClient } from '@ensemble-ai/shared-utils/providers';

const apiKey = process.env.NEXT_PUBLIC_OPENAI_TEST_KEY;
const describeIfKey = apiKey ? describe : describe.skip;

describeIfKey('OpenAI Free provider integration', () => {
  it(
    'validates configured API key against OpenAI models endpoint',
    async () => {
      const client = new FreeOpenAIClient('openai', () => apiKey!);
      const result = await client.validateApiKey(apiKey!);
      expect(result.valid).toBe(true);
    },
    20000,
  );
});
