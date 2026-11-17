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

`serializeStoreState` copies the whole state and changes only two things:

- each `apiKeys[provider]` keeps `encrypted` and `status`, with `key` set to `''` and `visible` set to `false`;
- `encryptionInitialized` is set to `false`.

So everything else is persisted, including the prompt, responses, manual responses, embeddings, similarity matrix, agreement stats and meta-analysis. The last run therefore survives a reload, a closed tab or a later visit to `/review`. Full history comes in M4.

A new run clears the old one: the prompt page's submit calls `startRun(prompt)`, which runs `resetStreamingState()` (responses, embeddings, agreement, consensus, consensus usage and majority vote) and records the run's prompt as `runPrompt` (and as the draft, so the two match). The `/review` "New comparison" and "Start over" buttons call `resetStreamingState()` directly. `/review` reads its prompt through `selectRunPrompt`: the run's prompt, or null when no run was submitted, so a draft that was never submitted never starts streams. `useStreamingResponses` starts streams once per visit to `/review`, so the reset done by those two buttons before they navigate starts nothing.

On load, the middleware merges the stored JSON over the initial state, after the store's `deserialize` option, `markInterruptedStreams`, has run on it. A fresh page has no live streams, so any answer stored with `isStreaming: true` (the page was reloaded or closed mid-stream) becomes an error of kind `interrupted` with `isComplete: true`. The review page shows it with a retry button instead of a spinner that never stops. There is no schema versioning.

The root layout (`src/app/layout.tsx`) calls `initializeEncryption()` after mount. It decrypts each stored `encrypted` key back into `key`. If decryption fails, that provider's key is cleared.

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

- State: `mode: 'free' | 'pro'` (default `'free'`), `isModeConfigured`
- Actions: `setMode(mode)`, `configureModeComplete()`
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

### Ensemble (`ensembleSlice.ts`)

- State:
  - `selectedModels: { id, provider, model }[]` (`model` is the API id, such as `gpt-6-luna`)
  - `summarizerModel: string | null`
  - `embeddingsProvider: 'auto' | 'openai' | 'google'` (default `'auto'`). The preference for agreement embeddings, set on `/config`. `src/lib/embeddingsProvider.ts` resolves it against the valid keys; older stored values such as `'anthropic'` count as `'auto'`.
  - `consensusMethod: 'standard' | 'elo' | 'majority' | 'council'` (default `'standard'`)
  - `eloTopN` (default `3`)
  - `savedEnsembles: { id, name, description, models, summarizer, consensusMethod, eloTopN }[]`
  - `currentEnsembleId`
- Actions: `addModel(provider, model)`, `removeModel(modelId)`, `setSummarizer(modelId)`, `setEmbeddingsProvider(preference)`, `setConsensusMethod(method)`, `setEloTopN(n)`, `saveEnsemble(name, description)`, `loadEnsemble(id)`, `deleteEnsemble(id)`, `clearSelection()`

### Responses (`responseSlice.ts`)

Helpers next to the slice: `responseTypes.ts` (the stored data shapes), `responseErrorState.ts` (error kinds and `markInterruptedStreams`) and `agreementState.ts` (similarity matrix and statistics from the embeddings).


- State: `prompt` (the draft on `/prompt`, saved as the user types), `runPrompt` (the prompt the current run was submitted with, so editing the next prompt never relabels the last run; `/review` falls back to `prompt` only for runs stored before it existed, which have answers but no `runPrompt`), `responses` (`{ modelId, provider, model, response, isStreaming, isComplete, responseTime, tokenCount, usage, error, errorKind, retryAfterSeconds }[]`, where `usage` is `{ inputTokens, outputTokens }` or null when the provider reported none, and `errorKind` is `invalid_key`, `missing_key`, `rate_limited`, `timeout`, `provider_unavailable`, `interrupted` or `other`), `manualResponses`, `embeddings`, `embeddingsSource` (provider that produced `embeddings`, or null), `similarityMatrix`, `agreementStats` (`mean`, `median`, `min`, `max`, `stddev`), `metaAnalysis`, `consensusUsage` (provider, model and tokens of each consensus call, used for the run cost), `majorityVote` (for majority runs: whether the vote or the LLM fallback made the consensus, the fallback reason, the vote tallies and the model names; null otherwise)
- Actions: `setPrompt`, `startRun(prompt)`, `startStreaming(modelId, provider, model)` (a restart clears the previous text, usage and error), `appendStreamChunk(modelId, chunk)`, `completeResponse(modelId, responseTime, tokenCount?, usage?)`, `setError(modelId, error, details?)` (`details` is `{ kind, retryAfterSeconds }`; the kind defaults to `other`), `addManualResponse(label, response)`, `removeManualResponse(id)`, `setEmbeddings(embeddings, source?)`, `calculateAgreement()`, `setMetaAnalysis(analysis)`, `addConsensusUsage(call)`, `setMajorityVote(vote)`, `clearConsensus()` (drops `metaAnalysis` and `majorityVote` so consensus runs again after a retry; keeps `consensusUsage`), `resetStreamingState()` (also clears `runPrompt`, `majorityVote` and `consensusUsage`, which otherwise keeps every consensus attempt of the run, including regenerations), `clearResponses()`
- `calculateAgreement()` builds a cosine similarity matrix from `embeddings` with `similarityMatrix` and `agreementStatistics` from `@ensemble-ai/shared-utils/similarity`, using the upper triangle for the stats. If the vectors cannot be compared (different lengths or a zero vector) it clears the matrix and stats instead of storing a wrong score. Embeddings come from OpenAI or Google (see [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md#embeddings-and-agreement-scores)); only mock mode uses hash-based vectors.

## Usage

Subscribe to the fields you need, not the whole store:

```typescript
const theme = useStore((state) => state.theme);
const toggleTheme = useStore((state) => state.toggleTheme);
```

Inside async callbacks, read fresh state with `useStore.getState()` to avoid stale closures. `useStreamingResponses` does this for API keys.

`useStreamingResponses.ts` buffers chunks and flushes them to the store every 100 ms to limit re-renders. The prompt page's own submit handler appends each chunk directly.

## Testing

Slice and store tests live in `src/store/__tests__/` and `tests/integration/store/`, and run with `npm test` (Vitest). Reset state between tests with `useStore.setState(...)`.

## Related

- [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md)
- [MOCK_CLIENT_SPECIFICATION.md](./MOCK_CLIENT_SPECIFICATION.md)
