# State Management

The app uses one Zustand store built from seven slices, with a small custom persistence middleware that writes to localStorage.

- Store: `src/store/index.ts`
- Slices: `src/store/slices/`
- Middleware: `src/store/middleware/persistenceMiddleware.ts`

## Root store

```typescript
export const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createThemeSlice(...a),
      ...createLanguageSlice(...a),
      ...createWorkflowSlice(...a),
      ...createModeSlice(...a),
      ...createApiKeySlice(...a),
      ...createEnsembleSlice(...a),
      ...createResponseSlice(...a),
    }),
    {
      name: 'ensemble-ai-store',
      serialize: serializeStoreState,
    },
  ),
);
```

`persist` here is the local middleware, not `zustand/middleware`.

## What gets persisted

The middleware subscribes to the store and writes `JSON.stringify(serialize(state))` to `localStorage['ensemble-ai-store']` on every change. Functions are dropped by `JSON.stringify`.

`serializeStoreState` copies the whole state and changes only three things:

- each `apiKeys[provider]` keeps `encrypted` and `status`, with `key` set to `''` and `visible` set to `false`;
- each OpenAI-compatible endpoint keeps `encryptedApiKey`, with `apiKey` set to `''` (`sanitizeEndpointsForPersist`);
- `encryptionInitialized` is set to `false`.

So everything else is persisted, including the prompt, responses, manual responses, embeddings, similarity matrix, agreement stats and meta-analysis. The last run therefore survives a reload, a closed tab or a later visit to the workspace. Full history comes in M4.

A new run clears the old one: asking in the workspace calls `startRun(prompt, models)` (through `useStreamingResponses.startRun`), which runs `resetStreamingState()` (responses, embeddings, agreement, consensus, consensus usage, majority vote and run models) and records the run's prompt as `runPrompt` (and as the draft, so the two match) and its models as `runModels`. "New question" in the history sidebar calls `resetStreamingState()` and `clearManualResponses()` and empties the draft. The workspace reads the run through `selectRunPrompt` (the run's prompt, or null when no run was submitted) and `selectRunModels`. Nothing starts streams on load: a stored run is shown as it was, so a draft that was never submitted never starts streams.

On load, the middleware merges the stored JSON over the initial state, after the store's `deserialize` option, `markInterruptedStreams`, has run on it. A fresh page has no live streams, so any answer stored with `isStreaming: true` (the page was reloaded or closed mid-stream) becomes an error of kind `interrupted` with `isComplete: true`. The workspace shows it with a retry button instead of a spinner that never stops. There is no schema versioning.

The root layout (`src/app/layout.tsx`) calls `initializeEncryption()` and `initializeEndpointKeys()` after mount. They decrypt each stored key back into plaintext. If decryption fails, that key is cleared.

Components that read persisted state use `useHasHydrated()` (`src/hooks/useHasHydrated.ts`) to avoid server/client hydration mismatches.

## Slices

### Theme (`themeSlice.ts`)

- State: `theme: 'light' | 'dark'` (default `'light'`)
- Actions: `setTheme(theme)`, `toggleTheme()`. Both also set the `light`/`dark` class on `document.documentElement`.

### Language (`languageSlice.ts`)

- State: `language: 'en' | 'fr'` (default `'en'`)
- Actions: `setLanguage(language)`

### Workflow (`workflowSlice.ts`)

- State: `currentStep: 'config' | 'ensemble' | 'prompt' | 'review'`, `stepsCompleted` (one boolean per step)
- Actions: `setCurrentStep(step)`, `completeStep(step)`, `resetWorkflow()`

### Mode (`modeSlice.ts`)

- State: `mode: 'free' | 'pro'` (default `'free'`), `isModeConfigured`, `onboardingDone` (the first-run onboarding sheet was finished or skipped; persisted)
- Actions: `setMode(mode)`, `configureModeComplete()`, `completeOnboarding()`
- Mock mode is not in the store. It is controlled by `NEXT_PUBLIC_MOCK_MODE`. Pro mode is disabled in the UI and has no client; see [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md).

### API keys (`apiKeySlice.ts`)

- State: `apiKeys` with one entry per provider (`openai`, `anthropic`, `google`, `xai`, `deepseek`, `perplexity`), each `null` or `{ encrypted, key, visible, status, error? }`; `encryptionInitialized`
- Actions:
  - `setApiKey(provider, key)`: trims, encrypts with `encrypt()` from `@ensemble-ai/shared-utils/security`, stores both. An empty key clears the entry.
  - `getApiKey(provider)`: returns the plaintext `key` or `null`.
  - `toggleApiKeyVisibility(provider)`, `hideAllApiKeys()`
  - `setApiKeyStatus(provider, status, error?)`
  - `initializeEncryption()`: decrypts persisted keys once per session.
  - `clearApiKeys()`
- Validation is not a slice action. It lives in `src/lib/validation.ts` and reports back through `setApiKeyStatus`.
- Encryption is AES-256-GCM with a key derived from browser and screen properties (`packages/shared-utils/src/security/encryption.ts`). The plaintext key is held in memory while the app runs.

### OpenAI-compatible endpoints (`endpointsSlice.ts`)

- State: `endpoints`, an ordered list of `{ id, presetId, label, baseURL, apiKey, encryptedApiKey, embeddingModel, status, error?, errorCode?, modelCount?, embeddingModelFound? }`. `errorCode` is a check failure with no server message (`baseUrlRequired`, `unreachable`, or `localBlocked` when a hosted page could not reach a server on this machine), translated by `EndpointInput`. `embeddingModelFound` says whether the last check saw the embedding model in the server's model list. The `id` is the preset id, then `ollama-2` and so on, and prefixes the endpoint's model ids (`ollama/llama3.2:3b`).
- Actions:
  - `addEndpoint(presetId, overrides?)`: adds an endpoint with the preset's base URL and suggested embedding model, or the `baseURL` and `embeddingModel` in `overrides` (the Ollama offer passes what detection found), and returns its id.
  - `updateEndpoint(id, { baseURL?, embeddingModel? })`: a new base URL resets the status to `idle`, so the workspace checks it again. A new embedding model clears `embeddingModelFound`, and the workspace checks again to look it up.
  - `setEndpointApiKey(id, key)`: trims and encrypts like `setApiKey`; an empty key clears it. Resets the status.
  - `setEndpointStatus(id, status, { error?, errorCode?, modelCount?, embeddingModelFound? })`, `removeEndpoint(id)`
  - `initializeEndpointKeys()`: decrypts persisted keys and resets checks a reload cut off.
  - `dismissOllamaOffer()`: sets `ollamaOfferDismissed` (persisted), so the workspace stops offering a detected Ollama.
- `selectEndpointConfigs(state)` gives the provider client the connected endpoints with their keys, and with their embedding model only when `embeddingModelFound` is true.
- Checks are not slice actions. `src/lib/endpointValidation.ts` does them and `app/workspace/hooks/useEndpointConfiguration.ts` reports back through `setEndpointStatus`. When a check of a local endpoint suggests an embedding model the server has, and the field is empty or still the preset's suggestion, the hook sets it with `updateEndpoint` and marks it found.

### Ensemble (`ensembleSlice.ts`)

- State:
  - `selectedModels: { id, provider, model }[]` (`model` is the API id, such as `gpt-6-luna`; for `openai-compatible` it is qualified with the endpoint id, such as `ollama/llama3.2:3b`)
  - `summarizerModel: string | null`
  - `embeddingsProvider: 'auto' | 'openai' | 'google' | 'openai-compatible'` (default `'auto'`). The preference for agreement embeddings, set in the workspace's settings sheet. `src/lib/embeddingsProvider.ts` resolves it against the valid keys; older stored values such as `'anthropic'` count as `'auto'`.
  - `consensusMethod: 'standard' | 'elo' | 'majority' | 'council'` (default `'standard'`)
  - `eloTopN` (default `3`)
  - `savedEnsembles: { id, name, description, models, summarizer, consensusMethod, eloTopN }[]`
  - `currentEnsembleId`
- Actions: `addModel(provider, model)`, `removeModel(modelId)`, `setSummarizer(modelId)`, `setEmbeddingsProvider(preference)`, `setConsensusMethod(method)`, `setEloTopN(n)`, `saveEnsemble(name, description)` (saving under an existing name replaces that ensemble and keeps its id), `loadEnsemble(id)` (a preset saved with no summarizer stores `''`, which loads as `null`, so the first model of the run summarises), `deleteEnsemble(id)`, `clearSelection()`

### Responses (`responseSlice.ts`)

Helpers next to the slice: `responseTypes.ts` (the stored data shapes), `responseErrorState.ts` (error kinds and `markInterruptedStreams`) and `agreementState.ts` (similarity matrix and statistics from the embeddings).


- State: `prompt` (the draft in the composer, saved as the user types), `runStartedAt` (when the current run started, in epoch ms, shown in the history sidebar; null with no run or for runs stored before it existed), `runPrompt` (the prompt the current run was submitted with, so editing the next prompt never relabels the last run; the workspace falls back to `prompt` only for runs stored before it existed, which have answers but no `runPrompt`), `responses` (`{ modelId, provider, model, response, isStreaming, isComplete, responseTime, tokenCount, usage, error, errorKind, retryAfterSeconds }[]`, where `usage` is `{ inputTokens, outputTokens }` or null when the provider reported none, and `errorKind` is `invalid_key`, `missing_key`, `rate_limited`, `timeout`, `provider_unavailable`, `interrupted` or `other`), `manualResponses`, `embeddings`, `embeddingsSource` (provider that produced `embeddings`, or null), `similarityMatrix`, `agreementStats` (`mean`, `median`, `min`, `max`, `stddev`), `metaAnalysis`, `consensusUsage` (provider, model and tokens of each consensus call, used for the run cost), `majorityVote` (for majority runs: whether the vote or the LLM fallback made the consensus, the fallback reason, the vote tallies and the model names; null otherwise)
- Actions: `setPrompt`, `startRun(prompt, models?)`, `startStreaming(modelId, provider, model)` (a restart clears the previous text, usage and error), `appendStreamChunk(modelId, chunk)`, `completeResponse(modelId, responseTime, tokenCount?, usage?)`, `setError(modelId, error, details?)` (`details` is `{ kind, retryAfterSeconds }`; the kind defaults to `other`), `addManualResponse(label, response)`, `removeManualResponse(id)`, `clearManualResponses()` (manual answers belong to one prompt, so New question in the workspace calls it), `setEmbeddings(embeddings, source?)`, `calculateAgreement()`, `setMetaAnalysis(analysis)`, `addConsensusUsage(call)`, `setMajorityVote(vote)`, `clearConsensus()` (drops `metaAnalysis` and `majorityVote` so consensus runs again after a retry; keeps `consensusUsage`), `resetStreamingState()` (also clears `runPrompt`, `runStartedAt`, `majorityVote` and `consensusUsage`, which otherwise keeps every consensus attempt of the run, including regenerations), `clearResponses()`
- `calculateAgreement()` builds a cosine similarity matrix from `embeddings` with `similarityMatrix` and `agreementStatistics` from `@ensemble-ai/shared-utils/similarity`, using the upper triangle for the stats. If the vectors cannot be compared (different lengths or a zero vector) it clears the matrix and stats instead of storing a wrong score. Embeddings come from OpenAI, Google or an OpenAI-compatible endpoint (see [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md#embeddings-and-agreement-scores)); only mock mode uses hash-based vectors.

## Usage

Subscribe to the fields you need, not the whole store:

```typescript
const theme = useStore((state) => state.theme);
const toggleTheme = useStore((state) => state.toggleTheme);
```

Inside async callbacks, read fresh state with `useStore.getState()` to avoid stale closures. `useStreamingResponses` does this for API keys.

`app/workspace/hooks/useStreamingResponses.ts` buffers each stream's chunks and flushes them to the store every 100 ms to limit re-renders. A stream writes only while it is the latest one for its model in its run (same `runStartedAt`), so a stream from a run that was reset or replaced never touches the next run.

## Testing

Slice and store tests live in `src/store/__tests__/` and `tests/integration/store/`, and run with `npm test` (Vitest). Reset state between tests with `useStore.setState(...)`.

## Related

- [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md)
- [MOCK_CLIENT_SPECIFICATION.md](./MOCK_CLIENT_SPECIFICATION.md)
