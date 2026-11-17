# @ensemble-ai/shared-utils

Non-UI code shared by the app and the eval package: provider clients, similarity maths, Web Crypto helpers, and re-exports of the consensus strategies. UI helpers stay in the component library.

The package is consumed from `dist/`. After changing it, rebuild:

```bash
npm run build --workspace=packages/shared-utils
```

The app's `tsconfig.json` also maps the bare `@ensemble-ai/shared-utils` import to `src/index.ts`, but subpath imports such as `@ensemble-ai/shared-utils/providers` resolve to `dist/`.

## Entry points

| Import | Contents |
|--------|----------|
| `@ensemble-ai/shared-utils` | Everything below |
| `@ensemble-ai/shared-utils/providers` | `AIProvider` and related types, `ProviderRegistry`, `createProviderClient`, `MockProviderClient`, the six `Free*Client` classes, `sanitizeProviderErrorMessage`, `ProviderError`, `classifyProviderError`, `DEFAULT_STREAM_TIMEOUT_MS` |
| `@ensemble-ai/shared-utils/similarity` | `cosineSimilarity`, `similarityMatrix`, `agreementStatistics`, `normalizeSimilarity` |
| `@ensemble-ai/shared-utils/security` | `encrypt`, `decrypt`, `deriveKey`, `isWebCryptoAvailable` |
| `@ensemble-ai/shared-utils/pricing` | `getModelPrice`, `PRICE_TABLE`, `estimateRun`, `countConsensusCalls`, `computeRunCost`, `withUsageTracking`, `estimateTokensFromText` |
| `@ensemble-ai/shared-utils/consensus` | Re-exports from `@ensemble-ai/consensus-core` and the four strategy packages (kept for backward compatibility; new code can import those packages directly) |

## Providers (`src/providers/`)

- Providers: `openai`, `anthropic`, `google`, `xai`, `deepseek`, `perplexity`.
- Modes: `mock` and `free` are implemented. `createProviderClient` throws `not yet implemented` for `pro`.
- Free clients call the provider APIs from the browser with the vendor SDKs (`dangerouslyAllowBrowser: true`). Perplexity is the exception: it calls the Agent API (`/v1/agent`) with `fetch`, and its model ids are effort presets (`perplexity-fast`, `perplexity-low`, `perplexity-medium`).
- Anthropic and OpenAI clients drop `temperature` for models that reject it, and Anthropic structured output uses `output_config.format` rather than a forced tool call. See the provider notes in the architecture document linked below.
- Embeddings (`src/providers/embeddings/`): OpenAI calls `text-embedding-3-small` through `requestOpenAICompatibleEmbedding` (`POST {baseURL}/embeddings`, optional key), which the OpenAI-compatible providers planned for M2 can reuse. Google calls `gemini-embedding-2` through `requestGeminiEmbedding` (`models/{model}:embedContent`, 768 dimensions via `outputDimensionality`). Other clients have `supportsEmbeddings = false` and throw `EmbeddingsNotSupportedError`; `BaseFreeClient` never returns fake vectors. `selectEmbeddingsProvider(preference, validProviders)` picks the override when its key is valid, otherwise OpenAI, then Google, or null.
- Perplexity has no `generateStructured` implementation.
- Errors (`src/providers/errors/providerError.ts`): every error a client passes to `onError` from `streamResponse` is a `ProviderError` with a `kind`: `invalid_key` (401, 403 or no key), `rate_limited` (429, with `retryAfterSeconds` from `Retry-After`, `retry-after-ms` or Google's `RetryInfo` when given), `timeout` (client-side, `StreamResponseOptions.timeoutMs`, default `DEFAULT_STREAM_TIMEOUT_MS` = 120 s), `provider_unavailable` (5xx or a network failure) or `other`. `classifyProviderError` reads the status from the SDK error, an axios response or the message. Messages are sanitized. After a timeout, late chunks and completions from the abandoned stream are dropped.
- Mock errors: `new MockProviderClient({ errorScenarios })` (or `createProviderClient({ mode: 'mock', mockErrorScenarios })`) fails the listed models with a simulated 401, 429 (Retry-After 30 s), 503 or timeout (`timeoutMs`, default 2 s in mock). `errorScenarios` maps model id (or `*`) to a kind, or is a function `(model) => kind | undefined` asked at the start of each call.

Full description: [packages/app/docs/PROVIDER_ARCHITECTURE.md](../app/docs/PROVIDER_ARCHITECTURE.md).

## Pricing (`src/pricing/`)

- `priceTable.ts` is generated; do not edit it by hand. Refresh it with `npm run prices:refresh` (public OpenRouter model lists, no key). The mapping from OpenRouter ids lives in `openRouterMapping.ts` and is tested against fixtures in `src/pricing/__fixtures__/`.
- `getModelPrice(provider, modelId)` gives USD per million input and output tokens, or `{ status: 'unknown' }`. It also accepts Anthropic ids with dots and Gemini ids with a `models/` prefix.
- `estimateRun(input)` returns call counts by kind (answers, consensus, embeddings) and a cost range before a run. `countConsensusCalls` mirrors the strategy packages; see the call counts in [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md#pricing).
- `computeRunCost(calls)` prices finished calls and flags the total as estimated when any call's tokens came from text length. It and `estimateRun` also count priced and unpriced calls, so a caller can tell a full cost from a lower bound or an unknown one.
- `withUsageTracking(provider, name, record)` wraps an `AIProvider` and reports the tokens of every completed call.
- Provider clients pass `{ inputTokens, outputTokens }` to `onComplete` as a fourth argument when the stream reports usage, and set `usage` on the result of `generateStructured`. Reasoning tokens count as output, including xAI's, which sit outside `completion_tokens`.

## Similarity (`src/similarity/`)

```typescript
import {
  cosineSimilarity,
  similarityMatrix,
  agreementStatistics,
  normalizeSimilarity,
} from '@ensemble-ai/shared-utils/similarity';

cosineSimilarity([1, 2, 3], [2, 3, 4]);    // -1 to 1; throws on empty, mismatched or zero vectors
similarityMatrix([v1, v2, v3]);            // n x n, diagonal is 1
agreementStatistics([0.85, 0.92, 0.78]);   // { mean, median, min, max, stddev }
normalizeSimilarity(0.4);                  // maps -1..1 to 0..1, clamped
```

These functions are correct for any vectors. The vectors the app feeds them today are placeholders (see Providers above).

## Security (`src/security/`)

- `encrypt(plaintext)` and `decrypt(ciphertext)`: AES-256-GCM via Web Crypto, output `base64(iv):base64(payload)`.
- `deriveKey()`: SHA-256 of browser and screen properties (user agent, language, platform, core count, screen size, time zone), imported as an AES key and cached. This keeps keys out of plain sight in localStorage; it does not protect against code running on the page, and changing browser or screen settings can make stored keys undecryptable.
- `isWebCryptoAvailable()`

## Development

```bash
npm run build       # tsc
npm test            # vitest run --coverage
npm run test:watch
npm run typecheck
npm run lint        # eslint, zero warnings allowed
npm run clean       # rm -rf dist
```

Tests sit next to the code (`*.test.ts`) and in `src/providers/__tests__/`. Coverage is measured for `src/providers`, `src/similarity` and `src/pricing`. Thresholds are currently lowered to 65% lines and statements, 75% functions and branches (`vitest.config.ts`).

## Dependency note

The Anthropic and Google clients import `@anthropic-ai/sdk` and `@google/generative-ai`, but those are not listed in this package's `package.json`. They resolve through the workspace because the app depends on them. `openai` is listed here as `^4.68.4`, while the app uses `^6.8.1`.

## License

UNLICENSED. Private.
