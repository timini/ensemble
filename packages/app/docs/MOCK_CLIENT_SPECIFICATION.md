# Mock Client Specification

**Document Version**: 1.0.0
**Last Updated**: 2025-10-01
**Target Phase**: Phase 2 (UI Integration)

## Overview

The Mock Client simulates AI provider streaming responses using lorem ipsum text. It enables:
- **UI development** without real API costs
- **E2E testing** with predictable, reproducible responses
- **Performance testing** of streaming UI components

## Purpose

Mock mode is **development-only** and **NOT user-facing**:
- ✅ Used by developers in Phase 2 for UI integration
- ✅ Used by Playwright E2E tests
- ❌ NOT exposed in the Config page mode selector (only Free/Pro shown to users)
- ❌ NOT available in production builds

---

## Behavior Specification

### 1. Response Generation

**Text Source**: Lorem ipsum generator

**Word Count**: 500-1000 words per response (randomized)

**Content Structure**:
```
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat...

[Continue for 500-1000 words total]
```

**Variation**:
- Each model generates slightly different lorem ipsum text
- Text length varies randomly within 500-1000 word range
- Ensures diverse responses for agreement analysis testing

---

### 2. Streaming Parameters

**Chunk Size**: 50-100 characters per chunk (randomized)

**Chunk Delay**: 50-100ms between chunks (randomized)

**Total Streaming Time**:
- Minimum: ~5 seconds (500 words ÷ 100 chars/chunk × 50ms)
- Maximum: ~10 seconds (1000 words ÷ 50 chars/chunk × 100ms)

**Example Timing**:
```
Word Count: 750 words ≈ 4500 characters
Chunk Size: 75 chars (average)
Chunks: 4500 ÷ 75 = 60 chunks
Delay: 75ms (average)
Total Time: 60 × 75ms = 4.5 seconds
```

**Latency Target**: <100ms p95 (measured from chunk generation to UI display)

---

### 3. Streaming Algorithm

```typescript
async function streamLoremIpsum(
  model: string,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string, responseTime: number) => void,
  onError: (error: Error) => void
): Promise<void> {
  const startTime = Date.now();

  try {
    // Generate lorem ipsum text (500-1000 words)
    const wordCount = randomInt(500, 1000);
    const fullText = generateLoremIpsum(wordCount);

    // Split into chunks (50-100 characters)
    const chunks: string[] = [];
    let position = 0;

    while (position < fullText.length) {
      const chunkSize = randomInt(50, 100);
      const chunk = fullText.slice(position, position + chunkSize);
      chunks.push(chunk);
      position += chunkSize;
    }

    // Stream chunks with delay
    for (const chunk of chunks) {
      const delay = randomInt(50, 100); // 50-100ms
      await sleep(delay);
      onChunk(chunk);
    }

    // Complete streaming
    const responseTime = Date.now() - startTime;
    onComplete(fullText, responseTime);
  } catch (error) {
    onError(error as Error);
  }
}
```

---

### 4. Model-Specific Responses

Each model generates **slightly different** lorem ipsum to simulate unique perspectives:

#### GPT-4o (OpenAI)
```
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam...
```
- **Word count**: 750-1000 words
- **Tone**: Slightly more formal/academic

#### Claude 3.5 Sonnet (Anthropic)
```
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
tempor incididunt. Ut labore et dolore magna aliqua enim ad minim veniam...
```
- **Word count**: 700-900 words
- **Tone**: Slightly more conversational

#### Gemini 1.5 Pro (Google)
```
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eiusmod tempor
incididunt ut labore et dolore magna aliqua, ad minim veniam quis nostrud...
```
- **Word count**: 600-800 words
- **Tone**: Slightly more technical

#### Grok-2 (XAI)
```
Lorem ipsum dolor sit amet, consectetur adipiscing. Sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua veniam quis nostrud exercitation...
```
- **Word count**: 500-700 words
- **Tone**: Slightly more casual

**Variation Purpose**: Ensures similarity scores vary (not all 1.0) for realistic agreement analysis testing.

---

### 5. Embeddings Generation

**Dimension**: 1536 (matches OpenAI text-embedding-3-small)

**Generation**: Random vector with controlled similarity

```typescript
async function generateMockEmbeddings(text: string): Promise<number[]> {
  // Generate base vector (deterministic from text hash)
  const baseVector = hashToVector(text, 1536);

  // Add controlled noise for variation
  return baseVector.map(val => val + (Math.random() - 0.5) * 0.1);
}

function hashToVector(text: string, dimension: number): number[] {
  // Simple hash to vector conversion for deterministic embeddings
  const hash = simpleHash(text);
  return Array.from({ length: dimension }, (_, i) => {
    return Math.sin(hash + i) * 0.5 + 0.5; // Normalize to [0, 1]
  });
}
```

**Similarity Behavior**:
- Similar text → embeddings with cosine similarity ~0.8-0.95
- Different text → embeddings with cosine similarity ~0.3-0.7
- Allows testing agreement analysis with realistic scores

---

### 6. Error Simulation

Mock client can simulate errors for testing error handling:

**Error Types**:
1. **Rate Limit Error** (10% probability)
   ```
   Error: Rate limit exceeded. Please try again in 60 seconds.
   ```

2. **Invalid Model Error** (if unknown model requested)
   ```
   Error: Model 'unknown-model' not found.
   ```

3. **Network Timeout** (5% probability after 5 seconds)
   ```
   Error: Request timed out after 5000ms.
   ```

**Configuration**:
```typescript
interface MockClientConfig {
  enableErrors: boolean;      // Default: false
  errorProbability: number;   // Default: 0.0 (0-1 range)
  timeoutAfterMs: number;     // Default: 30000
}
```

---

## Implementation

### MockAPIClient (`src/providers/clients/MockAPIClient.ts`)

```typescript
import { AIProvider } from '../interfaces/AIProvider';

export class MockAPIClient implements AIProvider {
  private config: MockClientConfig;

  constructor(config: MockClientConfig = {}) {
    this.config = {
      enableErrors: config.enableErrors ?? false,
      errorProbability: config.errorProbability ?? 0.0,
      timeoutAfterMs: config.timeoutAfterMs ?? 30000,
    };
  }

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    // Simulate error (if enabled)
    if (this.config.enableErrors && Math.random() < this.config.errorProbability) {
      onError(new Error('Rate limit exceeded. Please try again in 60 seconds.'));
      return;
    }

    const startTime = Date.now();

    try {
      // Generate lorem ipsum (500-1000 words)
      const wordCount = this.getWordCountForModel(model);
      const fullText = generateLoremIpsum(wordCount);

      // Split into chunks (50-100 chars)
      const chunks = this.chunkText(fullText);

      // Stream with delays
      for (const chunk of chunks) {
        const delay = randomInt(50, 100);
        await sleep(delay);
        onChunk(chunk);
      }

      // Complete
      const responseTime = Date.now() - startTime;
      onComplete(fullText, responseTime);
    } catch (error) {
      onError(error as Error);
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    // Generate deterministic vector from text hash
    return hashToVector(text, 1536);
  }

  async validateApiKey(apiKey: string): Promise<{ valid: boolean }> {
    // Mock always validates successfully
    return { valid: true };
  }

  listAvailableModels() {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        contextWindow: 128000,
        costPer1kTokens: 0.005,
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        costPer1kTokens: 0.003,
      },
      {
        id: 'gemini-1-5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        contextWindow: 1000000,
        costPer1kTokens: 0.00125,
      },
      {
        id: 'grok-2',
        name: 'Grok-2',
        provider: 'xai',
        contextWindow: 128000,
        costPer1kTokens: 0.002,
      },
    ];
  }

  private getWordCountForModel(model: string): number {
    // Model-specific word count ranges
    const ranges: Record<string, [number, number]> = {
      'gpt-4o': [750, 1000],
      'claude-3-5-sonnet': [700, 900],
      'gemini-1-5-pro': [600, 800],
      'grok-2': [500, 700],
    };

    const [min, max] = ranges[model] || [500, 1000];
    return randomInt(min, max);
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let position = 0;

    while (position < text.length) {
      const chunkSize = randomInt(50, 100);
      const chunk = text.slice(position, position + chunkSize);
      chunks.push(chunk);
      position += chunkSize;
    }

    return chunks;
  }
}
```

---

## Utility Functions

### Lorem Ipsum Generator

```typescript
const LOREM_IPSUM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
  'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
  'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam',
  'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip',
  // ... (expand to 100+ words)
];

function generateLoremIpsum(wordCount: number): string {
  const words: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    const word = LOREM_IPSUM_WORDS[i % LOREM_IPSUM_WORDS.length];
    words.push(word);
  }

  // Add punctuation every 10-15 words
  let text = '';
  for (let i = 0; i < words.length; i++) {
    text += words[i];

    if ((i + 1) % randomInt(10, 15) === 0) {
      text += '. ';
      // Capitalize next word
      if (i + 1 < words.length) {
        words[i + 1] = words[i + 1].charAt(0).toUpperCase() + words[i + 1].slice(1);
      }
    } else {
      text += ' ';
    }
  }

  return text.trim();
}
```

### Random Utilities

```typescript
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Hash to Vector

```typescript
function simpleHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function hashToVector(text: string, dimension: number): number[] {
  const hash = simpleHash(text);
  return Array.from({ length: dimension }, (_, i) => {
    return (Math.sin(hash + i) + 1) / 2; // Normalize to [0, 1]
  });
}
```

---

## Testing

### Unit Tests

```typescript
import { MockAPIClient } from '@/providers/clients/MockAPIClient';

describe('MockAPIClient', () => {
  it('streams lorem ipsum with correct timing', async () => {
    const client = new MockAPIClient();
    const chunks: string[] = [];
    const startTime = Date.now();

    await client.streamResponse(
      'Test prompt',
      'gpt-4o',
      (chunk) => chunks.push(chunk),
      (fullResponse, responseTime) => {
        // Verify word count
        const wordCount = fullResponse.split(' ').length;
        expect(wordCount).toBeGreaterThanOrEqual(750);
        expect(wordCount).toBeLessThanOrEqual(1000);

        // Verify timing
        expect(responseTime).toBeGreaterThan(5000);
        expect(responseTime).toBeLessThan(10000);
      },
      (error) => fail(error.message)
    );

    // Verify chunk count
    expect(chunks.length).toBeGreaterThan(50);
  });

  it('generates deterministic embeddings', async () => {
    const client = new MockAPIClient();
    const text = 'Lorem ipsum dolor sit amet';

    const embedding1 = await client.generateEmbeddings(text);
    const embedding2 = await client.generateEmbeddings(text);

    // Same text should produce identical embeddings
    expect(embedding1).toEqual(embedding2);
    expect(embedding1).toHaveLength(1536);
  });

  it('simulates errors when configured', async () => {
    const client = new MockAPIClient({
      enableErrors: true,
      errorProbability: 1.0, // Always error
    });

    let errorOccurred = false;

    await client.streamResponse(
      'Test prompt',
      'gpt-4o',
      (chunk) => {},
      (fullResponse, responseTime) => fail('Should have errored'),
      (error) => {
        errorOccurred = true;
        expect(error.message).toContain('Rate limit');
      }
    );

    expect(errorOccurred).toBe(true);
  });
});
```

### E2E Tests with Mock Mode

```typescript
import { test, expect } from '@playwright/test';

test('streaming displays chunks progressively', async ({ page }) => {
  await page.goto('/prompt');

  // Use mock mode
  await page.evaluate(() => {
    localStorage.setItem('ensemble-ai-mode', 'mock');
  });

  await page.fill('[data-testid="prompt-input"]', 'What is AI?');
  await page.click('[data-testid="submit-prompt"]');

  // Wait for streaming to start
  await page.waitForSelector('[data-testid="response-streaming"]');

  // Verify chunks appear progressively
  let previousLength = 0;
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    const text = await page.locator('[data-testid="response-gpt-4o"]').textContent();
    expect(text!.length).toBeGreaterThan(previousLength);
    previousLength = text!.length;
  }

  // Wait for completion
  await page.waitForSelector('[data-testid="response-complete"]');
  const finalText = await page.locator('[data-testid="response-gpt-4o"]').textContent();
  expect(finalText!.split(' ').length).toBeGreaterThan(500);
});
```

---

## Configuration

### Development Mode

```typescript
// Enable mock mode in development
export const MOCK_CLIENT_CONFIG = {
  enableErrors: false,        // No errors in dev
  errorProbability: 0.0,
  timeoutAfterMs: 30000,
};
```

### Testing Mode

```typescript
// Enable errors in E2E tests
export const MOCK_CLIENT_TEST_CONFIG = {
  enableErrors: true,         // Test error handling
  errorProbability: 0.1,      // 10% error rate
  timeoutAfterMs: 5000,       // Faster timeout
};
```

---

## Limitations

### What Mock Mode Does NOT Support

❌ **Real AI responses** - Only lorem ipsum text
❌ **Prompt-specific answers** - Same lorem ipsum regardless of prompt
❌ **Context awareness** - No conversation history
❌ **Real embeddings** - Random vectors only
❌ **Model-specific behavior** - All models use same algorithm
❌ **Token counting** - No accurate token usage
❌ **Cost calculation** - Fake costs only

### When to Use Real APIs

Use Free/Pro modes when you need:
- ✅ Actual AI model responses
- ✅ Prompt-specific answers
- ✅ Real embeddings for agreement analysis
- ✅ Production testing

---

## Related Documentation

- [PROVIDER_ARCHITECTURE.md](./PROVIDER_ARCHITECTURE.md) - AIProvider interface and client modes
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - Zustand store for response management
- [Constitution Principle XI](../../.specify/memory/constitution.md#xi-mock-client) - Mock client requirements

---

**Status**: ✅ Ready for Phase 2 Implementation
