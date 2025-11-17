import { describe, expect, it } from 'vitest';
import { FreeAnthropicClient } from '@ensemble-ai/shared-utils/providers';

const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_TEST_KEY;
const describeIfKey = apiKey ? describe : describe.skip;

describeIfKey('Anthropic Free provider integration', () => {
  it(
    'validates configured API key by listing models',
    async () => {
      const client = new FreeAnthropicClient('anthropic', () => apiKey!);
      const result = await client.validateApiKey(apiKey!);
      expect(result.valid).toBe(true);
    },
    20000,
  );
});
