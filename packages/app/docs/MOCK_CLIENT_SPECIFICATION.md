# Mock Client Specification

`MockProviderClient` (`packages/shared-utils/src/providers/clients/mock/MockProviderClient.ts`) implements `AIProvider` without any network calls. It streams lorem ipsum so the UI and the mock-mode Playwright suite can run without API keys or cost.

## When it is used

- **Mock mode.** Start the app with `npm run dev:mock` (sets `NEXT_PUBLIC_MOCK_MODE=true`). Every provider call then uses the mock client. The `packages/e2e` `mock-mode` project starts the app this way.
- **Fallbacks in other modes.** The prompt page and `src/lib/embeddings.ts` fall back to the mock client if no client is registered for the current mode.
- **Inside the free clients.** `BaseFreeClient` keeps a mock instance and uses it for `generateEmbeddings` (always) and for model lists when no key is set or the provider's list call fails.

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
| `gpt-4o` | 750 to 1000 |
| `gpt-4o-mini` | 600 to 800 |
| `o1-preview` | 650 to 850 |
| `claude-3-5-sonnet` | 700 to 900 |
| `claude-3-opus` | 800 to 1000 |
| `claude-3-haiku` | 550 to 750 |
| `gemini-1.5-pro` | 700 to 950 |
| `gemini-1.5-flash` | 600 to 800 |
| `grok-2` | 700 to 900 |
| `grok-2-mini` | 550 to 750 |
| `sonar` | 600 to 800 |
| `sonar-pro` | 700 to 900 |
| `sonar-reasoning` | 650 to 850 |
| anything else | 600 to 800 |

At these settings a response takes roughly 4 to 9 seconds to stream.

### generateEmbeddings

Returns a 1536-length vector, deterministic for a given text:

```typescript
const hash = simpleHash(text); // 32-bit string hash
return Array.from({ length: 1536 }, (_, i) => (Math.sin(hash + i) + 1) / 2);
```

There is no noise term. The values reflect the hash of the text, not its meaning. Because the free clients also use this function, agreement scores in every mode are computed from these vectors and are not semantic.

### validateApiKey

Waits 100 to 300 ms and returns `{ valid: true }` for any input.

### generateStructured

Waits 50 to 150 ms and returns an object where each schema property that has an `enum` gets its first enum value. Other properties are left out.

### listAvailableModels and listAvailableTextModels

Return a static list of 15 models across all six providers (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Grok 2, DeepSeek Chat, Sonar and others). With `providerFilter` set, only that provider's models are returned. `listAvailableTextModels` returns the display names.

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
- Embeddings and agreement scores are not meaningful.
- Token counts and costs are estimates only.
- No timeout or network error simulation.

## Related

- [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md)
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
