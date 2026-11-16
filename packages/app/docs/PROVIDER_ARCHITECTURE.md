# Provider Architecture

How the app talks to model providers. The code lives in `packages/shared-utils/src/providers/`; the app wires it up in `packages/app/src/providers/index.ts`.

Supported providers (`ProviderName` in `packages/shared-utils/src/providers/types.ts`): `openai`, `anthropic`, `google`, `xai`, `deepseek`, `perplexity`.

## Modes

`ProviderMode` is `'mock' | 'free' | 'pro'`.

| Mode | Status | How calls are made |
|------|--------|--------------------|
| `mock` | Built. Developer only, enabled with `NEXT_PUBLIC_MOCK_MODE=true` | `MockProviderClient` streams lorem ipsum in the browser. No network calls |
| `free` | Built. The only mode users can select | Browser calls each provider directly with the user's key, using the vendor SDKs with `dangerouslyAllowBrowser: true` |
| `pro` | Not built yet. Disabled on `/config` | `createProviderClient` throws `Provider mode 'pro' not yet implemented.` See [ROADMAP](../../../docs/ROADMAP.md) |

The store's user-facing mode is only `'free' | 'pro'`. The app picks `mock` when `NEXT_PUBLIC_MOCK_MODE === 'true'`, regardless of the stored mode.

## AIProvider interface

Every client implements `AIProvider` (`packages/shared-utils/src/providers/types.ts`):

```typescript
export interface AIProvider {
  streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number, tokenCount?: number) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions, // { temperature?, seed? }
  ): Promise<void>;

  generateEmbeddings(text: string): Promise<number[]>;

  validateApiKey(apiKey: string): Promise<ValidationResult>; // { valid, error? }

  listAvailableModels(): ModelMetadata[];

  listAvailableTextModels(): Promise<string[]>;

  generateStructured<T>(
    prompt: string,
    model: string,
    schema: JsonSchema,
    options?: GenerateStructuredOptions,
  ): Promise<StructuredResponse<T>>;
}
```

`generateStructured` returns JSON constrained to a schema using each provider's native structured output feature. The app does not call it today; the eval package uses it for its LLM judges.

## Clients

### MockProviderClient

`packages/shared-utils/src/providers/clients/mock/MockProviderClient.ts`. Lorem ipsum streaming, hash-based embeddings, always-valid keys, a static model list. Details in [MOCK_CLIENT_SPECIFICATION.md](./MOCK_CLIENT_SPECIFICATION.md).

### Free clients

One class per provider, each extending `BaseFreeClient` (`clients/base/BaseFreeClient.ts`):

| Provider | Class | SDK |
|----------|-------|-----|
| OpenAI | `FreeOpenAIClient` | `openai` |
| Anthropic | `FreeAnthropicClient` | `@anthropic-ai/sdk` |
| Google | `FreeGoogleClient` | `@google/generative-ai` |
| xAI | `FreeXAIClient` | `openai` with `baseURL: https://api.x.ai/v1` |
| DeepSeek | `FreeDeepSeekClient` | `openai` with `baseURL: https://api.deepseek.com` |
| Perplexity | `FreePerplexityClient` | `openai` with `baseURL: https://api.perplexity.ai` |

What `BaseFreeClient` does:

- Reads the key through a `getApiKey()` callback. The app passes a callback that reads the decrypted key from the Zustand store.
- `streamResponse` reports a missing-key error, races the provider stream against a 2 minute timeout, and sanitizes error messages before passing them on.
- `listAvailableTextModels` calls the provider's model list API when a key is present and falls back to the mock list on failure or when no key is set.
- `generateStructured` delegates to each subclass. Perplexity does not implement it, so it throws "structured output is not yet implemented for Free mode".
- `generateEmbeddings` checks the key is present, then returns `MockProviderClient.generateEmbeddings(text)`. No client calls a real embeddings API.

### Embeddings and agreement scores

Because of that fallback, every embedding in the app (all modes) is a deterministic sine vector seeded by a hash of the text. The review page's cosine similarity matrix and agreement statistics are computed on these vectors. They do not measure semantic agreement. Real embeddings are not built yet; see [ROADMAP](../../../docs/ROADMAP.md).

## Factory and registry

`createProviderClient({ provider, mode, getApiKey })` (`factories/createProviderClient.ts`):

- `mock`: returns `new MockProviderClient({ providerFilter: provider })`.
- `free`: requires `getApiKey`, returns the matching `Free<Provider>Client`.
- anything else: throws `Provider mode '<mode>' not yet implemented.`

`ProviderRegistry` (`registry/ProviderRegistry.ts`) is a singleton map keyed by provider and mode, with `register`, `getProvider`, `hasProvider`, `listProviders` and `clearAll`. `getProvider` throws if nothing is registered.

The app's `initializeProviders()` (`packages/app/src/providers/index.ts`) registers a mock and a free client for each of the six providers. It is called from the root layout and again from a few hooks before use. Nothing is registered for `pro`.

## How the app uses it

- `/config`: `src/lib/validation.ts` calls `validateApiKey` on the free client (or mock client in mock mode).
- `/ensemble`: `src/lib/providerModels.ts` calls `listAvailableTextModels` to fill the model picker.
- `/prompt` and `/review`: `streamResponse` is called once per selected model (`src/app/prompt/page.tsx`, `src/app/review/hooks/useStreamingResponses.ts`). If the client for the current mode is missing, the prompt page and `src/lib/embeddings.ts` fall back to the mock client.
- `/review`: `src/lib/embeddings.ts` calls `generateEmbeddings`; `src/app/review/hooks/useConsensusGeneration.ts` passes the summarizer model's client to the chosen consensus strategy (`standard`, `elo`, `majority`, `council`).

Example, simplified from the prompt page:

```typescript
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';

const registry = ProviderRegistry.getInstance();
const client = registry.getProvider(selection.provider, clientMode);

void client.streamResponse(
  prompt,
  selection.model,
  (chunk) => appendStreamChunk(selection.id, chunk),
  (_full, responseTime, tokenCount) => completeResponse(selection.id, responseTime, tokenCount),
  (error) => setError(selection.id, error.message),
);
```

## Server-side provider path

Separate from the browser clients, the app has a tRPC `provider` router (`src/server/api/routers/provider.ts`, backed by `src/server/providers/providerService.ts`) with `listTextModels`, `streamText` (a mutation that buffers the whole response) and `streamTextEvents` (a subscription). It uses server-held keys from env vars and requires a Firebase ID token. No UI code calls it, and there is no client-side sign-in. It is groundwork for Pro mode, which is not built yet.

## Security notes

- Free-mode keys are encrypted with AES-256-GCM (Web Crypto) before they reach localStorage. The key is derived from browser and screen properties, so this guards against casual reading of localStorage, not against code running on the page.
- Keys are sent straight to the provider from the browser. They never touch the Ensemble server.
- Provider error messages pass through `sanitizeProviderErrorMessage` before display.

## Testing

- Unit tests sit next to the clients (for example `FreeOpenAIClient.test.ts`) and run with Vitest in `packages/shared-utils`.
- The mock-mode Playwright suite in `packages/e2e` starts the app with `npm run dev:mock`.

## Related

- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
- [MOCK_CLIENT_SPECIFICATION.md](./MOCK_CLIENT_SPECIFICATION.md)
