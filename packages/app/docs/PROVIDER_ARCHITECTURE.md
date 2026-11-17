# Provider Architecture

How the app talks to model providers. The code lives in `packages/shared-utils/src/providers/`; the app wires it up in `packages/app/src/providers/index.ts`.

Supported providers (`ProviderName` in `packages/shared-utils/src/providers/types.ts`): `openai`, `anthropic`, `google`, `xai`, `deepseek`, `perplexity`, and `openai-compatible`, which covers every configured OpenAI-compatible endpoint (Ollama, LM Studio, llama.cpp, vLLM, OpenRouter, Groq, Together, custom URLs).

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
    onComplete: (
      fullResponse: string,
      responseTime: number,
      tokenCount?: number,
      usage?: TokenUsage, // { inputTokens, outputTokens } when the provider reports them
    ) => void,
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

`packages/shared-utils/src/providers/clients/mock/MockProviderClient.ts`. Lorem ipsum streaming, hash-based embeddings (used in mock mode only), always-valid keys, a static model list. Details in [MOCK_CLIENT_SPECIFICATION.md](./MOCK_CLIENT_SPECIFICATION.md).

### Free clients

One class per provider, each extending `BaseFreeClient` (`clients/base/BaseFreeClient.ts`):

| Provider | Class | SDK |
|----------|-------|-----|
| OpenAI | `FreeOpenAIClient` | `openai` |
| Anthropic | `FreeAnthropicClient` | `@anthropic-ai/sdk` |
| Google | `FreeGoogleClient` | `@google/generative-ai` |
| xAI | `FreeXAIClient` | `openai` with `baseURL: https://api.x.ai/v1` |
| DeepSeek | `FreeDeepSeekClient` | `openai` with `baseURL: https://api.deepseek.com` |
| Perplexity | `FreePerplexityClient` | `fetch` to the Agent API, `https://api.perplexity.ai/v1/agent` |
| OpenAI-compatible | `FreeOpenAICompatibleClient` (one server), routed by `OpenAICompatibleEndpointsClient` | `fetch` to `{baseURL}/models`, `/chat/completions` and `/embeddings` |

Provider notes:

- Perplexity: Sonar Chat Completions ended on 2026-09-27. The client sends `{ effort, input, stream: true }` to `POST /v1/agent` and reads the `response.output_text.delta` and `response.completed` server-sent events. Model ids are effort presets: `perplexity-fast`, `perplexity-low`, `perplexity-medium`. Saved `sonar`, `sonar-pro` and `sonar-reasoning-pro` selections map to `fast`, `fast` and `low`. `validateApiKey` calls `GET /v1/models`, which needs a valid key but runs no model. Temperature and seed are not forwarded.
- Anthropic: Claude Opus 4.7 and later (all 5.x models included) reject a non-default `temperature`, so it is only sent to older models. `generateStructured` uses structured outputs (`output_config.format` with a JSON schema) because Opus 5.5 and Sonnet 5.5 return HTTP 400 for a forced `tool_choice`. Claude 3.x, Opus 4 and Sonnet 4 predate structured outputs and still get a forced tool call. `max_tokens` is 16000 for streaming and 8000 for structured output, since thinking tokens count against it on 5.5 models. Rules live in `clients/anthropic/anthropicModelRules.ts`.
- OpenAI-compatible: the key is optional (`requiresApiKey = false` in `BaseFreeClient`), and no Authorization header is sent without one. Model ids are qualified with the endpoint id (`ollama/llama3.2:3b`); `OpenAICompatibleEndpointsClient` reads the connected endpoints from the store at call time and sends each call to the endpoint in the id, with the bare model id. The model list is every id from `GET /models`, unfiltered. Streaming asks for `stream_options.include_usage`. `generateStructured` tries `json_schema`, then `json_object`, then plain prompting, and extracts the JSON from the text. See "OpenAI-compatible endpoints" in [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).
- OpenAI: the client never sets `reasoning_effort`, and models reject `temperature` when their effort is above `none`. It is dropped for models whose default effort is above `none`: the o-series, `gpt-5`, GPT-5.5 and later, the GPT-6 family, and the GPT-5.1 and GPT-5.2 `-codex` and `-pro` variants. Base `gpt-5.1` and `gpt-5.2` default to `none` and `-chat` variants are not reasoning models, so both still get `temperature` (`clients/openai/openAIModelRules.ts`).

What `BaseFreeClient` does:

- Reads the key through a `getApiKey()` callback. The app passes a callback that reads the decrypted key from the Zustand store.
- `streamResponse` reports a missing key, races the provider stream against a client-side timeout (`StreamResponseOptions.timeoutMs`, default `DEFAULT_STREAM_TIMEOUT_MS`, 2 minutes), and drops chunks or completions that arrive after the timeout.
- Every error passed to `onError` is a `ProviderError` (`src/providers/errors/providerError.ts`) with a sanitized message and a `kind`: `invalid_key` (401 or 403), `missing_key` (no key is set, so no request was sent), `rate_limited` (429, with `retryAfterSeconds` from `Retry-After`, `retry-after-ms` or Google's `RetryInfo`), `timeout`, `provider_unavailable` (5xx or a network failure) or `other`. `classifyProviderError` reads the status from the SDK error, an axios response or the message; each client's stream `catch` calls it with its label (for example "Anthropic API error").
- `listAvailableTextModels` calls the provider's model list API when a key is present and falls back to the mock list on failure or when no key is set. The OpenAI-compatible client returns an empty list instead, never mock models.
- `generateStructured` delegates to each subclass. Perplexity does not implement it, so it throws "structured output is not yet implemented for Free mode".
- `generateEmbeddings` throws `EmbeddingsNotSupportedError` unless the subclass sets `supportsEmbeddings` and implements `embedWithProvider`. When it does, it checks the key is present and calls the provider.

### Embeddings and agreement scores

Code in `packages/shared-utils/src/providers/embeddings/`.

| Provider | Model | Call |
|----------|-------|------|
| OpenAI | `text-embedding-3-small` | `requestOpenAICompatibleEmbedding`: `POST {baseURL}/embeddings` with `{ model, input }` and an optional bearer key |
| Google | `gemini-embedding-2` | `requestGeminiEmbedding`: `POST /v1beta/models/{model}:embedContent` with the `x-goog-api-key` header and `outputDimensionality: 768` (the model default is 3072) to keep the persisted store small |
| OpenAI-compatible | the embedding model set on the endpoint, for example `nomic-embed-text` on Ollama | `requestOpenAICompatibleEmbedding` on the first connected endpoint whose embedding model the check found in `GET /models` |
| Anthropic, xAI, DeepSeek, Perplexity | none | throw `EmbeddingsNotSupportedError` |

`requestOpenAICompatibleEmbedding` takes a base URL, an optional key and a model id, so OpenAI and every OpenAI-compatible endpoint share it. Error messages from both helpers go through `sanitizeProviderErrorMessage`.

Provider choice: `selectEmbeddingsProvider` (shared-utils) and `resolveEmbeddingsProvider` (`packages/app/src/lib/embeddingsProvider.ts`). The stored preference is `auto`, `openai`, `google` or `openai-compatible`, set with the embeddings provider setting on `/config`. An override is used when its key is valid; otherwise OpenAI, then Google, then an OpenAI-compatible endpoint. `openai-compatible` counts as available only when a connected endpoint has an embedding model that its server lists (`src/lib/endpointStatus.ts`). With none available there is no provider, and the review page shows "No agreement score" instead of a score. Mock mode follows the same rule: mock keys validate, so a mock run needs a mock OpenAI or Google key for a score, and the mock-mode E2E suite covers the no-provider message (`embeddings-unavailable.spec.ts`). If the embeddings calls fail for all but one answer, or the vectors cannot be compared, it shows "Agreement could not be scored". If some calls fail but at least two answers have embeddings, the score covers those answers and a note lists the answers left out.

The store records which provider produced the embeddings (`embeddingsSource`). When `/review` mounts again (reload, back and forward) and the stored embeddings came from the provider now resolved, they are reused and no embeddings calls are made.

The review page computes the cosine similarity matrix and agreement statistics from these vectors with `shared-utils/similarity`. Only mock mode uses the mock client's hash-based vectors.

The high, medium and low labels depend on the embedding model. `src/lib/agreementCalibration.ts` looks up the model in use (`openai/text-embedding-3-small`, `google/gemini-embedding-2`, or the endpoint preset and embedding model, such as `ollama/nomic-embed-text`) in the committed `src/data/agreement-calibration.json`, written by `ensemble-eval calibrate-agreement` from benchmark runs (see `packages/eval/docs/BENCHMARKS.md`). A model with no entry keeps the original mapping, (cosine + 1) / 2 above 0.8 high and from 0.5 medium, and the analysis shows an "Uncalibrated" badge. The file has no entries yet.

## Factory and registry

`createProviderClient({ provider, mode, getApiKey })` (`factories/createProviderClient.ts`):

- `mock`: returns `new MockProviderClient({ providerFilter: provider })`.
- `free`: requires `getApiKey`, returns the matching `Free<Provider>Client`. For `openai-compatible` it requires `getEndpoints` instead and returns an `OpenAICompatibleEndpointsClient`.
- anything else: throws `Provider mode '<mode>' not yet implemented.`

`ProviderRegistry` (`registry/ProviderRegistry.ts`) is a singleton map keyed by provider and mode, with `register`, `getProvider`, `hasProvider`, `listProviders` and `clearAll`. `getProvider` throws if nothing is registered.

The app's `initializeProviders()` (`packages/app/src/providers/index.ts`) registers a mock and a free client for each of the seven providers. The free `openai-compatible` client gets the connected endpoints from `selectEndpointConfigs` in `store/slices/endpointsSlice.ts`. It is called from the root layout and again from a few hooks before use. Nothing is registered for `pro`.

## How the app uses it

- `/config`: `src/lib/validation.ts` calls `validateApiKey` on the free client (or mock client in mock mode). OpenAI-compatible endpoints are checked by `src/lib/endpointValidation.ts` (`GET /models`, which also counts the models; no request in mock mode) from `config/hooks/useEndpointConfiguration.ts`, 500 ms after an edit.
- `/ensemble`: `src/lib/providerModels.ts` calls `listAvailableTextModels` to fill the model picker. `src/lib/endpointModels.ts` lists the models of connected endpoints and names them `llama3.2:3b (Ollama)`.
- `/prompt` and `/review`: `streamResponse` is called once per selected model (`src/app/prompt/page.tsx`, `src/app/review/hooks/useStreamingResponses.ts`). If the client for the current mode is missing, the prompt page falls back to the mock client. `src/lib/embeddings.ts` does not: it throws, so no fake vectors reach the agreement score.
- `/review`: `src/lib/embeddings.ts` calls `generateEmbeddings` on the provider chosen by `src/lib/embeddingsProvider.ts`; `src/app/review/hooks/useConsensusGeneration.ts` passes the summarizer model's client to the chosen consensus strategy (`standard`, `elo`, `majority`, `council`).

Example, simplified from the prompt page:

```typescript
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';

const registry = ProviderRegistry.getInstance();
const client = registry.getProvider(selection.provider, clientMode);

void client.streamResponse(
  prompt,
  selection.model,
  (chunk) => appendStreamChunk(selection.id, chunk),
  (_full, responseTime, tokenCount, usage) =>
    completeResponse(selection.id, responseTime, tokenCount, usage),
  (error) => {
    const failure = toResponseError(error); // src/lib/responseErrors.ts
    setError(selection.id, failure.message, failure.details);
  },
);
```

### Errors on the review page

The response slice stores each failed answer's message, `errorKind` and `retryAfterSeconds`. `ResponseCard` shows the error through the `ResponseErrorNotice` molecule: a plain explanation per kind (EN and FR), the provider message and a retry button. Retry restarts only that model (`useStreamingResponses.retryModel`), and clears the consensus so it runs again once every answer is back. A consensus still running when the retry starts finishes, but its result is dropped (`useConsensusGeneration.restart`), since it leaves out the retried model. Consensus calls already made stay in the run cost.

One failed model does not fail the run. Agreement (`useReviewAnalytics`) and consensus (`useConsensusTrigger`) use only answers without an error, plus any manual answers. `RunExclusionNote` names the failed models and, once the run has finished, says how many answers were used. It mentions the agreement score only when an embeddings provider is available. When fewer than 2 answers succeeded (manual answers count), it explains why there is no consensus and the consensus card is hidden. After a consensus error the trigger does not fire again until a retry, so a failing summarizer is not called in a loop.

## Server-side provider path

Separate from the browser clients, the app has a tRPC `provider` router (`src/server/api/routers/provider.ts`, backed by `src/server/providers/providerService.ts`) with `listTextModels`, `streamText` (a mutation that buffers the whole response) and `streamTextEvents` (a subscription). It uses server-held keys from env vars and requires a Firebase ID token. No UI code calls it, and there is no client-side sign-in. It is groundwork for Pro mode, which is not built yet.

## Security notes

- Free-mode keys are encrypted with AES-256-GCM (Web Crypto) before they reach localStorage. The key is derived from browser and screen properties, so this guards against casual reading of localStorage, not against code running on the page.
- Keys are sent straight to the provider from the browser. They never touch the Ensemble server. Endpoint keys are encrypted the same way and sent only to their endpoint.
- Provider error messages pass through `sanitizeProviderErrorMessage` before display.

## Testing

- Unit tests sit next to the clients (for example `FreeOpenAIClient.test.ts`) and run with Vitest in `packages/shared-utils`.
- The mock-mode Playwright suite in `packages/e2e` starts the app with `npm run dev:mock`. `openai-compatible-mock.spec.ts` runs an ensemble on mock endpoint models.
- The `local-endpoint` Playwright project starts a second app server in Free mode on port 3100 (its own build directory, `NEXT_DIST_DIR=.next-e2e-free`) and the fake OpenAI-compatible server in `packages/e2e/fixtures/fake-openai-server.mjs` on port 11499. Its test runs a 3-model ensemble with no cloud key, scores agreement with the fake server's embeddings and writes the consensus, all through the real client code. `npm run test:mock` runs it too.

## Related

- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
- [MOCK_CLIENT_SPECIFICATION.md](./MOCK_CLIENT_SPECIFICATION.md)
