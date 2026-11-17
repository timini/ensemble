# Mock Client Specification

`MockProviderClient` (`packages/shared-utils/src/providers/clients/mock/MockProviderClient.ts`) implements `AIProvider` without any network calls. It streams lorem ipsum so the UI and the mock-mode Playwright suite can run without API keys or cost.

## When it is used

- **Mock mode.** Start the app with `npm run dev:mock` (sets `NEXT_PUBLIC_MOCK_MODE=true`). Every provider call then uses the mock client. The `packages/e2e` `mock-mode` project starts the app this way.
- **Fallbacks in other modes.** The prompt page falls back to the mock client if no client is registered for the current mode. Embeddings never fall back to it outside mock mode.
- **Inside the free clients.** `BaseFreeClient` keeps a mock instance for the static model metadata and for model lists when no key is set or the provider's list call fails. It is not used for embeddings.

Mock mode is not offered in the app's settings. It is controlled only by the env var, which is read at build time, so a build made with `NEXT_PUBLIC_MOCK_MODE=true` serves mock responses.

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

The `final_answers` schema (the majority vote extraction call) is the exception. The mock returns one answer of kind `number` for each response label (`[R1]`, `[R2]`, ...) in the prompt. Every answer is `42` except the last one when there are three or more, which is `41`. A mock majority run therefore ends with a vote winner.

### listAvailableModels and listAvailableTextModels

Return a static list of 16 models across all seven providers, using real provider ids (GPT-6 Astra, Claude Opus 5.5, Gemini 4 Carbon, Grok 4.7, DeepSeek V4 Pro, Perplexity Fast and others). The `openai-compatible` models are qualified with the `ollama` endpoint id (`ollama/llama3.2:3b`, `ollama/qwen2.5:7b`, `ollama/gemma3:4b`); in mock mode the app offers them under the id of each configured endpoint (`src/lib/endpointModels.ts`). With `providerFilter` set, only that provider's models are returned. `listAvailableTextModels` returns the display names.

## Configuration

```typescript
interface MockClientConfig {
  enableErrors?: boolean;     // default false
  errorProbability?: number;  // default 0
  timeoutAfterMs?: number;    // default 30000, stored but not used
  providerFilter?: ProviderName;
  errorScenarios?: MockErrorScenarios | ((model: string) => MockErrorScenario | undefined);
}
```

When `enableErrors` is true, `streamResponse` fails with a simulated 429 with probability `errorProbability`.

### Simulated provider errors

`errorScenarios` maps a model id (or `*` for every model) to `invalid_key`, `rate_limited`, `provider_unavailable` or `timeout`, or is a function asked at the start of each call. For a listed model:

- `invalid_key`, `rate_limited`, `provider_unavailable`: after 100 to 200 ms, `onError` gets a `ProviderError` with status 401, 429 (with `retryAfterSeconds: 30`) or 503.
- `timeout`: one chunk is sent, then the stream stalls until `options.timeoutMs` (default 2 s in mock) and fails with a `timeout` `ProviderError`.
- `generateStructured` rejects with the same kind.

In the app (mock mode only), `src/lib/mockErrorScenarios.ts` feeds this from the `mockErrors` query parameter on any page, for example `/config?mockErrors=gpt-6-luna:401,gpt-6-astra:timeout` (the redirect into the workspace keeps it). The value is read once per page load and kept in sessionStorage for the tab; `mockErrors=` clears it. Kinds can be written as `401`, `403`, `429`, `500`, `502`, `503`, `timeout` or the kind names. Adding `:once` (`gpt-6-luna:429:once`) fails only the first call, so a retry succeeds. The mock-mode E2E tests in `packages/e2e/tests/mock-mode/provider-errors.spec.ts` use it.

## Limitations

- Output ignores the prompt and has no structure.
- Embeddings and agreement scores are not meaningful in mock mode. The embeddings provider is still picked from the configured keys, as in Free mode, so without an OpenAI or Google key there is no score.
- The mock client reports no `usage`, so the workspace labels the run cost as estimated from text length. The `costPer1kTokens` values in its model list are not used for pricing; the shared price table is.
- Network errors other than the scenarios above (DNS, CORS, dropped connections) are not simulated.

## Related

- [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md)
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
