# Mock Client Specification

`MockProviderClient` (`packages/shared-utils/src/providers/clients/mock/MockProviderClient.ts`) implements `AIProvider` without any network calls. It streams lorem ipsum so the UI and the mock-mode Playwright suite can run without API keys or cost.

## When it is used

- **Mock mode.** Start the app with `npm run dev:mock` (sets `NEXT_PUBLIC_MOCK_MODE=true`). Every provider call then uses the mock client. The `packages/e2e` `mock-mode` project starts the app this way.
- **Fallbacks in other modes.** The prompt page falls back to the mock client if no client is registered for the current mode. Embeddings never fall back to it outside mock mode.
- **Inside the free clients.** `BaseFreeClient` keeps a mock instance for the static model metadata and for model lists when no key is set or the provider's list call fails. It is not used for embeddings.

Mock mode is not offered on `/config`. It is controlled only by the env var, which is read at build time, so a build made with `NEXT_PUBLIC_MOCK_MODE=true` serves mock responses.

## Behavior

### streamResponse

- Ignores the prompt. Output does not depend on it.
- Picks a word count from a per-model range (see below), then builds text by picking random words from a fixed lorem ipsum list. No punctuation or capitalisation.
- Splits the text into chunks of 50 to 100 characters.
- Waits 50 to 100 ms before each chunk and calls `onChunk`.
- Calls `onComplete(fullText, responseTime, tokenCount)` with `tokenCount = round(wordCount * 1.3)`.

Word count ranges by model id:

| Model id | Words |
|----------|-------|
| `gpt-6-astra` | 750 to 1000 |
| `gpt-6-luna` | 600 to 800 |
| `claude-opus-5-5` | 800 to 1000 |
| `claude-sonnet-5-5` | 700 to 900 |
| `claude-haiku-5-5` | 550 to 750 |
| `gemini-4-carbon` | 700 to 950 |
| `gemini-4-hydrogen` | 600 to 800 |
| `grok-4.7` | 700 to 900 |
| `grok-4.3` | 550 to 750 |
| `deepseek-v4-pro` | 700 to 900 |
| `deepseek-flash` | 550 to 750 |
| `perplexity-fast` | 600 to 800 |
| `perplexity-low` | 700 to 900 |
| anything else | 600 to 800 |

At these settings a response takes roughly 4 to 9 seconds to stream.

### generateEmbeddings

Returns a 1536-length vector, deterministic for a given text:

```typescript
const hash = simpleHash(text); // 32-bit string hash
return Array.from({ length: 1536 }, (_, i) => (Math.sin(hash + i) + 1) / 2);
```

There is no noise term. The values reflect the hash of the text, not its meaning, so agreement scores in mock mode are not semantic. Free mode uses real OpenAI or Google embeddings.

### validateApiKey

Waits 100 to 300 ms and returns `{ valid: true }` for any input.

### generateStructured

Waits 50 to 150 ms and returns an object where each schema property that has an `enum` gets its first enum value. Other properties are left out.

### listAvailableModels and listAvailableTextModels

Return a static list of 13 models across all six providers, using real provider ids (GPT-6 Astra, Claude Opus 5.5, Gemini 4 Carbon, Grok 4.7, DeepSeek V4 Pro, Perplexity Fast and others). With `providerFilter` set, only that provider's models are returned. `listAvailableTextModels` returns the display names.

## Configuration

```typescript
interface MockClientConfig {
  enableErrors?: boolean;     // default false
  errorProbability?: number;  // default 0
  timeoutAfterMs?: number;    // default 30000, stored but not used
  providerFilter?: ProviderName;
}
```

When `enableErrors` is true, `streamResponse` fails with `Rate limit exceeded. Please try again in 60 seconds.` with probability `errorProbability`. The app always creates mock clients with only `providerFilter`, so errors are never simulated in the running app.

## Limitations

- Output ignores the prompt and has no structure.
- Embeddings and agreement scores are not meaningful in mock mode.
- Token counts and costs are estimates only.
- No timeout or network error simulation.

## Related

- [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md)
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
