# State Management Architecture

**Document Version**: 1.0.0
**Last Updated**: 2025-10-01
**Target Phase**: Phase 2 (UI Integration)

## Overview

Ensemble AI uses **Zustand** for state management with localStorage persistence. State is organized into focused slices following single-responsibility principles, with middleware handling persistence and cross-slice synchronization.

## Architecture Principles

### 1. Slice-Based Organization
Each slice manages a specific domain of application state:
- **Separation of concerns**: Each slice has clear boundaries
- **Composability**: Slices can reference each other when needed
- **Testability**: Individual slices can be tested in isolation

### 2. Persistence Strategy
- **Essential data persists**: Theme, language, API keys (encrypted), ensemble configurations
- **Transient data in-memory**: Current responses, streaming state, UI state
- **Selective persistence**: Only serialize what's needed between sessions

### 3. Type Safety
- Full TypeScript support with strict types
- Exported types for actions and state
- Type inference for store consumers

---

## Store Structure

### Root Store (`src/store/index.ts`)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { themeSlice } from './slices/themeSlice';
import { languageSlice } from './slices/languageSlice';
import { workflowSlice } from './slices/workflowSlice';
import { modeSlice } from './slices/modeSlice';
import { apiKeySlice } from './slices/apiKeySlice';
import { ensembleSlice } from './slices/ensembleSlice';
import { responseSlice } from './slices/responseSlice';

export const useStore = create(
  persist(
    (...args) => ({
      ...themeSlice(...args),
      ...languageSlice(...args),
      ...workflowSlice(...args),
      ...modeSlice(...args),
      ...apiKeySlice(...args),
      ...ensembleSlice(...args),
      ...responseSlice(...args),
    }),
    {
      name: 'ensemble-ai-storage',
      partialize: (state) => ({
        // Persist only essential state
        theme: state.theme,
        language: state.language,
        mode: state.mode,
        apiKeys: state.apiKeys, // Encrypted before storage
        savedEnsembles: state.savedEnsembles,
        currentStep: state.currentStep,
      }),
    }
  )
);
```

---

## State Slices

### 1. Theme Slice (`themeSlice.ts`)

**Purpose**: Manage light/dark theme preferences

**State**:
```typescript
{
  theme: 'light' | 'dark';
}
```

**Actions**:
- `setTheme(theme: 'light' | 'dark')` - Set theme and update DOM
- `toggleTheme()` - Toggle between light/dark

**Persistence**: ✅ Persisted

---

### 2. Language Slice (`languageSlice.ts`)

**Purpose**: Manage i18n language selection (EN/FR)

**State**:
```typescript
{
  language: 'en' | 'fr';
}
```

**Actions**:
- `setLanguage(lang: 'en' | 'fr')` - Set language and update i18next
- `toggleLanguage()` - Toggle between EN/FR

**Persistence**: ✅ Persisted

---

### 3. Workflow Slice (`workflowSlice.ts`)

**Purpose**: Track user progress through 4-step workflow

**State**:
```typescript
{
  currentStep: 'config' | 'ensemble' | 'prompt' | 'review';
  stepsCompleted: {
    config: boolean;
    ensemble: boolean;
    prompt: boolean;
    review: boolean;
  };
}
```

**Actions**:
- `setCurrentStep(step)` - Navigate to workflow step
- `completeStep(step)` - Mark step as completed
- `resetWorkflow()` - Reset to config step

**Persistence**: ✅ Persisted (current step only)

---

### 4. Mode Slice (`modeSlice.ts`)

**Purpose**: Manage operating mode (Free/Pro)

**State**:
```typescript
{
  mode: 'free' | 'pro';
  isModeConfigured: boolean;
}
```

**Actions**:
- `setMode(mode)` - Switch between Free/Pro
- `configureModeComplete()` - Mark mode configuration as done

**Persistence**: ✅ Persisted

**Note**: Mock mode is development-only, not exposed to users.

---

### 5. API Key Slice (`apiKeySlice.ts`)

**Purpose**: Manage provider API keys (Free Mode only)

**State**:
```typescript
{
  apiKeys: {
    openai: string | null;
    anthropic: string | null;
    google: string | null;
    xai: string | null;
  };
  encryptionKey: string | null; // Device-derived key
}
```

**Actions**:
- `setApiKey(provider, key)` - Store encrypted API key
- `getApiKey(provider)` - Retrieve decrypted API key
- `clearApiKeys()` - Remove all API keys
- `validateApiKey(provider, key)` - Test API key validity

**Persistence**: ✅ Persisted (encrypted with AES-256-GCM via Web Crypto API)

**Security**:
- Keys encrypted before localStorage storage
- Device-specific encryption key derived from browser entropy
- Keys never logged or exposed in dev tools

---

### 6. Ensemble Slice (`ensembleSlice.ts`)

**Purpose**: Manage model selection and ensemble configuration

**State**:
```typescript
{
  selectedModels: Array<{
    id: string;
    provider: 'openai' | 'anthropic' | 'google' | 'xai';
    model: string;
  }>;
  summarizerModel: string | null;
  embeddingsProvider: 'openai' | 'anthropic' | 'google' | 'xai';
  savedEnsembles: Array<{
    id: string;
    name: string;
    description: string;
    models: Array<ModelSelection>;
    summarizer: string;
  }>;
  currentEnsembleId: string | null;
}
```

**Actions**:
- `addModel(provider, model)` - Add model to ensemble
- `removeModel(modelId)` - Remove model from ensemble
- `setSummarizer(modelId)` - Designate summarizer model
- `setEmbeddingsProvider(provider)` - Select embeddings provider
- `saveEnsemble(name, description)` - Save current configuration as preset
- `loadEnsemble(ensembleId)` - Load saved ensemble preset
- `deleteEnsemble(ensembleId)` - Remove saved ensemble

**Persistence**: ✅ Persisted (saved ensembles and current configuration)

---

### 7. Response Slice (`responseSlice.ts`)

**Purpose**: Manage AI responses and streaming state

**State**:
```typescript
{
  prompt: string | null;
  responses: Array<{
    modelId: string;
    provider: string;
    model: string;
    response: string;
    isStreaming: boolean;
    isComplete: boolean;
    responseTime: number | null;
    error: string | null;
  }>;
  manualResponses: Array<{
    id: string;
    label: string;
    response: string;
  }>;
  embeddings: Array<{
    modelId: string;
    embedding: number[];
  }>;
  similarityMatrix: number[][] | null;
  agreementStats: {
    mean: number;
    median: number;
    min: number;
    max: number;
    stddev: number;
  } | null;
  metaAnalysis: string | null;
}
```

**Actions**:
- `setPrompt(prompt)` - Set current prompt
- `startStreaming(modelId)` - Initialize streaming response
- `appendStreamChunk(modelId, chunk)` - Append streamed text
- `completeResponse(modelId, responseTime)` - Mark response complete
- `setError(modelId, error)` - Set error state for model
- `addManualResponse(label, response)` - Add manual response
- `calculateAgreement(embeddings)` - Compute similarity matrix and stats
- `setMetaAnalysis(analysis)` - Store summarizer meta-analysis
- `clearResponses()` - Reset for new prompt

**Persistence**: ❌ NOT persisted (transient, regenerated on each prompt)

---

## Persistence Middleware

### Custom Persistence Middleware (`persistenceMiddleware.ts`)

Handles selective state persistence with encryption:

```typescript
export const persistenceMiddleware = (config) => (set, get, api) =>
  config(
    (args) => {
      set(args);
      // After state update, persist to localStorage
      const state = get();
      const persistedState = {
        theme: state.theme,
        language: state.language,
        mode: state.mode,
        apiKeys: encryptApiKeys(state.apiKeys), // Encrypt before storage
        savedEnsembles: state.savedEnsembles,
        currentStep: state.currentStep,
      };
      localStorage.setItem('ensemble-ai-storage', JSON.stringify(persistedState));
    },
    get,
    api
  );
```

**Features**:
- Selective persistence (only essential state)
- Automatic encryption for API keys
- Hydration on app initialization
- Quota management (localStorage 5-10MB limit)

---

## Usage Examples

### 1. Theme Management

```typescript
import { useStore } from '@/store';

function ThemeToggle() {
  const { theme, toggleTheme } = useStore();

  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### 2. API Key Management

```typescript
import { useStore } from '@/store';

function ApiKeyInput() {
  const { setApiKey, getApiKey } = useStore();
  const [key, setKey] = useState(getApiKey('openai') || '');

  const handleSave = () => {
    setApiKey('openai', key);
  };

  return (
    <input
      type="password"
      value={key}
      onChange={(e) => setKey(e.target.value)}
    />
  );
}
```

### 3. Ensemble Management

```typescript
import { useStore } from '@/store';

function EnsembleBuilder() {
  const { selectedModels, addModel, setSummarizer } = useStore();

  const handleAddModel = () => {
    addModel('openai', 'gpt-4o');
  };

  return (
    <div>
      {selectedModels.map(model => (
        <ModelCard key={model.id} model={model} />
      ))}
    </div>
  );
}
```

### 4. Response Streaming

```typescript
import { useStore } from '@/store';

function ResponseViewer() {
  const { responses, appendStreamChunk } = useStore();

  useEffect(() => {
    const stream = fetchStreamingResponse(prompt);
    stream.on('chunk', (modelId, chunk) => {
      appendStreamChunk(modelId, chunk);
    });
  }, [prompt]);

  return (
    <div>
      {responses.map(resp => (
        <ResponseCard key={resp.modelId} response={resp} />
      ))}
    </div>
  );
}
```

---

## Testing

### Unit Testing Slices

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStore } from '@/store';

describe('themeSlice', () => {
  it('toggles theme', () => {
    const { result } = renderHook(() => useStore());

    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
  });
});
```

### Integration Testing with Components

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from '@/store';

describe('ModelSelectionList', () => {
  it('adds model to ensemble', async () => {
    render(<ModelSelectionList />);

    const addButton = screen.getByTestId('add-model-gpt-4o');
    await userEvent.click(addButton);

    const { selectedModels } = useStore.getState();
    expect(selectedModels).toHaveLength(1);
    expect(selectedModels[0].model).toBe('gpt-4o');
  });
});
```

---

## Migration Strategy

### Phase 2: Mock Mode (Current)
- All slices implemented
- Persistence enabled for essential state
- Mock responses in responseSlice

### Phase 3: Free Mode
- Add encryption to apiKeySlice
- Integrate real provider SDKs
- Real streaming in responseSlice

### Phase 4: Pro Mode
- Add creditSlice for usage tracking
- Add subscriptionSlice for billing
- Remove apiKeySlice (managed backend)

---

## Performance Considerations

### 1. Selective Subscriptions
Use selectors to subscribe only to needed state:

```typescript
// Bad: Re-renders on ANY state change
const store = useStore();

// Good: Re-renders only when theme changes
const theme = useStore(state => state.theme);
```

### 2. localStorage Quota
- Keep persisted state minimal (<1MB)
- Monitor quota usage
- Clear old ensembles if quota exceeded

### 3. Response State
- Don't persist large response strings
- Use pagination for response history
- Clear responses when navigating away

---

## Related Documentation

- [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md) - AIProvider interface and client modes
- [MOCK_CLIENT_SPECIFICATION.md](./MOCK_CLIENT_SPECIFICATION.md) - Mock streaming behavior
- [Constitution Principle IX](../.specify/memory/constitution.md#ix-state-management) - State management requirements

---

**Status**: ✅ Ready for Phase 2 Implementation
