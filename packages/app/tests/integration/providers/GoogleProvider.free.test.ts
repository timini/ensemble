import { describe, expect, it } from 'vitest';
import { FreeGoogleClient } from '@ensemble-ai/shared-utils/providers';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TEST_KEY;
const describeIfKey = apiKey ? describe : describe.skip;

describeIfKey('Google Free provider integration', () => {
  it(
    'validates configured API key against Generative Language API',
    async () => {
      const client = new FreeGoogleClient('google', () => apiKey!);
      const result = await client.validateApiKey(apiKey!);
      expect(result.valid).toBe(true);
    },
    20000,
  );
});
