# Provider Architecture

**Document Version**: 1.0.0
**Last Updated**: 2025-10-01
**Target Phases**: Phase 2 (Mock), Phase 3 (Free), Phase 4 (Pro)

## Overview

The Provider Architecture defines how Ensemble AI interacts with AI model providers (OpenAI, Anthropic, Google, XAI) across three operating modes:

- **Mock Mode** (Phase 2): Frontend-only lorem ipsum streaming for UI development and E2E testing
- **Free Mode** (Phase 3): Frontend-only direct API calls to providers with user-supplied API keys
- **Pro Mode** (Phase 4): Backend-managed API calls with credit system and usage tracking

## Architecture Principles

### 1. Polymorphic Client Pattern
All three client modes implement the same `AIProvider` interface, enabling:
- **Seamless mode switching**: Same UI code works across all modes
- **Testability**: Mock mode for E2E tests without real API costs
- **Gradual rollout**: Free mode before Pro mode infrastructure is ready

### 2. Frontend-Only Until Phase 4
- Mock and Free modes run entirely in the browser
- No backend required for Phase 2-3
- API keys encrypted locally (Free mode)
- Backend introduced only in Phase 4 (Pro mode)

### 3. Provider Isolation
Each provider (OpenAI, Anthropic, Google, XAI) has its own implementation:
- **Encapsulation**: Provider-specific logic isolated
- **Maintainability**: Changes to one provider don't affect others
- **Extensibility**: New providers can be added without refactoring

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│  (Config, Ensemble, Prompt, Review Pages)                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Provider Registry                         │
│  - getProvider(provider, mode)                              │
│  - Delegates to provider-specific factories                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌────────────────┐  ┌─────────────────────────────┐
│ Provider       │  │ Provider client factories   │
│ implementations│  │  (createProviderClient)     │
│ (OpenAI, etc.) │  │   ├─ openai/mock|free|pro   │
└───────┬────────┘  │   ├─ anthropic/mock|free|pro│
        │           │   ├─ google/mock|free|pro   │
        │           │   └─ xai/mock|free|pro      │
        │           └─────────────────────────────┘
        │                          │
        ▼                          ▼
┌───────────────┐        ┌──────────────────────┐
│ Mock clients  │        │ Free-mode clients     │
│ (lorem ipsum) │        │ (SDK integrations)    │
└──────┬────────┘        └─────────┬────────────┘
       │                           │
       ▼                           ▼
┌──────────────┐         ┌──────────────────────┐
│ Lorem Ipsum  │         │ Provider SDKs / APIs │
└──────────────┘         └──────────────────────┘

(Phase 4 introduces Pro clients backed by the tRPC backend.)
```

---

## AIProvider Interface

### Core Interface (`packages/shared-utils/src/providers/types.ts`)

```typescript
/**
 * Abstract interface for all AI provider implementations
 * Implemented by: MockProviderClient, Free<Provider>Client, Pro<Provider>Client
 */
export interface AIProvider {
  /**
   * Stream a response from the AI model
   * @param prompt - User input text
   * @param model - Model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet')
   * @param onChunk - Callback for each streaming chunk
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback for errors
   * @returns Promise resolving to full response text
   */
  streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void
  ): Promise<void>;

  /**
   * Generate embeddings for agreement analysis
   * @param text - Text to generate embeddings for
   * @returns Promise resolving to embedding vector (1536 dimensions)
   */
  generateEmbeddings(text: string): Promise<number[]>;

  /**
   * Validate API key (Free mode only)
   * @param apiKey - API key to validate
   * @returns Promise resolving to validation result
   */
  validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }>;

  /**
   * List available models for this provider
   * @returns Array of model metadata
   */
  listAvailableModels(): Array<{
    id: string;
    name: string;
    contextWindow: number;
    costPer1kTokens: number;
  }>;
}
```

---

## Client Implementations

### 1. Mock Clients (Phase 2)

**Purpose**: Lorem ipsum streaming for UI development and E2E testing

**Location**: `packages/shared-utils/src/providers/clients/mock/MockProviderClient.ts`

**Behavior**:
- Generates random lorem ipsum text (500-1000 words)
- Streams in chunks of 50-100 characters
- Delay between chunks: 50-100ms
- Total streaming time: ~5-10 seconds per response
- No real API calls
- No API keys required

**Implementation**:
```typescript
export class MockProviderClient implements AIProvider {
  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const startTime = Date.now();
    const lorem = generateLoremIpsum(500, 1000); // 500-1000 words
    const chunks = chunkText(lorem, 50, 100); // 50-100 char chunks

    for (const chunk of chunks) {
      await sleep(randomInt(50, 100)); // 50-100ms delay
      onChunk(chunk);
    }

    const responseTime = Date.now() - startTime;
    onComplete(lorem, responseTime);
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    // Return random 1536-dimensional vector
    return Array.from({ length: 1536 }, () => Math.random());
  }

  async validateApiKey(apiKey: string): Promise<{ valid: boolean }> {
    return { valid: true }; // Mock always validates
  }

  listAvailableModels() {
    return MOCK_MODELS; // Static list
  }
}
```

**Usage**: Development, Storybook, Playwright E2E tests

---

### 2. Free Clients (Phase 3)

**Purpose**: Direct API calls to providers with user-supplied API keys.

**Location**: `packages/shared-utils/src/providers/clients/<provider>/Free<Provider>Client.ts`

**Behavior**:
- Each provider owns its Free-mode implementation (e.g., `FreeOpenAIClient`, `FreeAnthropicClient`).
- Keys encrypted with AES-256-GCM before localStorage storage.
- Direct API calls from browser to provider SDKs.
- API key validation via lightweight test requests.
- Streaming/embeddings implemented per provider (falling back to mock responses until finished).

**Factory Pattern**:
```typescript
// packages/shared-utils/src/providers/factories/createProviderClient.ts
export function createProviderClient(
  { provider, mode, getApiKey }: CreateProviderClientOptions,
): AIProvider {
  if (mode === 'mock') {
    return new MockProviderClient({ providerFilter: provider });
  }

  if (mode === 'free') {
    if (!getApiKey) throw new Error('Free mode requires getApiKey');
    return new Free<Provider>Client(provider, getApiKey);
  }

  throw new Error('Pro mode client not yet implemented.');
}
```

**Security**:
- API keys encrypted before localStorage.
- Web Crypto API (AES-256-GCM) with device-derived entropy.
- Keys never logged or exposed.

---

### 3. ProAPIClient (Phase 4)

**Purpose**: Backend-managed API calls with credit system

**Location**: `src/providers/clients/ProAPIClient.ts`

**Behavior**:
- No user-provided API keys
- All API calls go through tRPC backend
- Backend manages provider API keys
- Credit-based usage tracking
- Subscription management
- Real streaming via Server-Sent Events (SSE)

**Implementation**:
```typescript
export class ProAPIClient implements AIProvider {
  private trpc: ReturnType<typeof createTRPCClient>;

  constructor() {
    this.trpc = createTRPCClient({
      url: '/api/trpc',
    });
  }

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // tRPC subscription for streaming
      const stream = this.trpc.provider.streamResponse.subscribe({
        prompt,
        model,
      });

      let fullResponse = '';
      const startTime = Date.now();

      for await (const chunk of stream) {
        fullResponse += chunk;
        onChunk(chunk);
      }

      const responseTime = Date.now() - startTime;
      onComplete(fullResponse, responseTime);
    } catch (error) {
      onError(error as Error);
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    return this.trpc.provider.generateEmbeddings.query({ text });
  }

  async validateApiKey(apiKey: string): Promise<{ valid: boolean }> {
    // Not applicable in Pro mode (no user-provided keys)
    throw new Error('validateApiKey not supported in Pro mode');
  }

  listAvailableModels() {
    // Fetch from backend (includes available models based on subscription)
    return this.trpc.provider.listModels.query();
  }
}
```

**Backend Features**:
- API key management (secure storage)
- Usage tracking (tokens, requests, cost)
- Credit system (prepaid or subscription)
- Rate limiting
- Analytics

**Usage**: Pro Mode (Phase 4) - Managed service with billing

---

## Provider Implementations

### Provider-Specific Clients

Each provider has its own implementation handling API-specific details:

#### Free client mapping

- OpenAI: `packages/shared-utils/src/providers/clients/openai/FreeOpenAIClient.ts`
- Anthropic: `packages/shared-utils/src/providers/clients/anthropic/FreeAnthropicClient.ts`
- Google: `packages/shared-utils/src/providers/clients/google/FreeGoogleClient.ts`
- XAI: `packages/shared-utils/src/providers/clients/xai/FreeXAIClient.ts`

Each class extends `BaseFreeClient` (`packages/shared-utils/src/providers/clients/base/BaseFreeClient.ts`), which currently falls back to mock streaming/embeddings while real integrations are implemented.

---

## Provider Registry

### Singleton Registry (`src/providers/ProviderRegistry.ts`)

```typescript
import { MockProviderClient } from '@ensemble-ai/shared-utils/providers';
import { FreeAPIClient } from './clients/FreeAPIClient';
import { ProAPIClient } from './clients/ProAPIClient';
import { useStore } from '@/store';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private clients: Map<string, AIProvider>;

  private constructor() {
    this.clients = new Map();
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  getProvider(mode: 'mock' | 'free' | 'pro'): AIProvider {
    if (this.clients.has(mode)) {
      return this.clients.get(mode)!;
    }

    let client: AIProvider;

    switch (mode) {
      case 'mock':
        client = new MockProviderClient();
        break;
      case 'free':
        const apiKeys = useStore.getState().apiKeys;
        client = new FreeAPIClient(apiKeys);
        break;
      case 'pro':
        client = new ProAPIClient();
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    this.clients.set(mode, client);
    return client;
  }

  clearCache() {
    this.clients.clear();
  }
}

export const getProvider = (mode: 'mock' | 'free' | 'pro') =>
  ProviderRegistry.getInstance().getProvider(mode);
```

**Usage**:
```typescript
import { getProvider } from '@/providers/ProviderRegistry';

const client = getProvider('free');
await client.streamResponse(prompt, model, onChunk, onComplete, onError);
```

---

## Usage Examples

### Example 1: Streaming Response

```typescript
import { getProvider } from '@/providers/ProviderRegistry';
import { useStore } from '@/store';

function PromptPage() {
  const { mode, appendStreamChunk, completeResponse } = useStore();

  const handleSubmit = async (prompt: string) => {
    const client = getProvider(mode);
    const selectedModels = useStore.getState().selectedModels;

    for (const model of selectedModels) {
      await client.streamResponse(
        prompt,
        model.model,
        (chunk) => appendStreamChunk(model.id, chunk),
        (fullResponse, responseTime) => completeResponse(model.id, responseTime),
        (error) => setError(model.id, error.message)
      );
    }
  };

  return <PromptInput onSubmit={handleSubmit} />;
}
```

### Example 2: Agreement Analysis

```typescript
import { getProvider } from '@/providers/ProviderRegistry';
import { cosineSimilarity, similarityMatrix } from '@ensemble-ai/shared-utils/similarity';

async function calculateAgreement(responses: Array<{ modelId: string; response: string }>) {
  const client = getProvider(mode);

  // Generate embeddings for all responses
  const embeddings = await Promise.all(
    responses.map(r => client.generateEmbeddings(r.response))
  );

  // Calculate similarity matrix
  const matrix = similarityMatrix(embeddings);

  // Calculate agreement statistics
  const similarities = matrix.flat().filter((val, i) => i % embeddings.length !== i);
  const stats = agreementStatistics(similarities);

  return { matrix, stats };
}
```

---

## Testing

### Unit Testing Providers

```typescript
import { MockProviderClient } from '@ensemble-ai/shared-utils/providers';

describe('MockProviderClient', () => {
  it('streams lorem ipsum response', async () => {
    const client = new MockProviderClient();
    const chunks: string[] = [];

    await client.streamResponse(
      'Test prompt',
      'gpt-4o',
      (chunk) => chunks.push(chunk),
      (fullResponse, responseTime) => {
        expect(fullResponse.length).toBeGreaterThan(500);
        expect(responseTime).toBeGreaterThan(0);
      },
      (error) => fail(error.message)
    );

    expect(chunks.length).toBeGreaterThan(10);
  });
});
```

### E2E Testing with Mock Mode

```typescript
import { test, expect } from '@playwright/test';

test('complete workflow with mock responses', async ({ page }) => {
  await page.goto('/config');
  await page.click('[data-testid="mode-mock"]');
  await page.click('[data-testid="continue-to-ensemble"]');

  await page.goto('/ensemble');
  await page.click('[data-testid="add-model-gpt-4o"]');
  await page.click('[data-testid="continue-to-prompt"]');

  await page.goto('/prompt');
  await page.fill('[data-testid="prompt-input"]', 'What is AI?');
  await page.click('[data-testid="submit-prompt"]');

  await page.goto('/review');
  await expect(page.locator('[data-testid="response-gpt-4o"]')).toBeVisible();
  await expect(page.locator('[data-testid="response-gpt-4o"]')).toContainText('Lorem ipsum');
});
```

---

## Migration Path

### Phase 2: Mock Mode Only
- Implement MockProviderClient
- UI development with fake streaming
- E2E tests without API costs

### Phase 3: Add Free Mode
- Implement FreeAPIClient
- Add encryption for API keys
- Integrate provider SDKs
- Real streaming responses

### Phase 4: Add Pro Mode
- Implement ProAPIClient
- Build tRPC backend
- Add credit system
- Subscription management

---

## Related Documentation

- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - Zustand store architecture
- [MOCK_CLIENT_SPECIFICATION.md](./MOCK_CLIENT_SPECIFICATION.md) - Lorem ipsum streaming behavior
- [Constitution Principle X](../.specify/memory/constitution.md#x-provider-architecture) - Provider requirements

---

**Status**: ✅ Ready for Phase 2 Implementation
