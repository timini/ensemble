/**
 * MockProviderClient
 *
 * Mock AI provider implementation for UI development and automated testing.
 * Generates lorem ipsum text with streaming behaviour that mimics real APIs.
 */

import type {
  AIProvider,
  GenerateStructuredOptions,
  JsonSchema,
  ModelMetadata,
  StreamResponseOptions,
  StructuredResponse,
  ValidationResult,
  ProviderName,
} from '../../types.js';
import { ProviderError, type ProviderErrorKind } from '../../errors/providerError';

/** Provider failures the mock client can simulate. */
export type MockErrorScenario = Exclude<ProviderErrorKind, 'other'>;

/** Scenario per model id. The key `*` applies to every model. */
export type MockErrorScenarios = Partial<Record<string, MockErrorScenario>>;

/** Returns the scenario for one call to `model`, or undefined to succeed. */
export type MockErrorResolver = (model: string) => MockErrorScenario | undefined;

export interface MockClientConfig {
  enableErrors?: boolean;
  errorProbability?: number;
  timeoutAfterMs?: number;
  providerFilter?: ProviderName;
  /**
   * Simulated failures: a fixed map, or a function asked for the model's
   * scenario at the start of each call (so a test or the app's mock mode can
   * change them between calls, or fail a model only once).
   */
  errorScenarios?: MockErrorScenarios | MockErrorResolver;
}

interface MockClientResolvedConfig {
  enableErrors: boolean;
  errorProbability: number;
  timeoutAfterMs: number;
  providerFilter?: ProviderName;
  errorScenarios?: MockErrorScenarios | MockErrorResolver;
}

/** Default client-side timeout for a simulated `timeout` scenario. */
const MOCK_TIMEOUT_MS = 2000;
/** Retry-After sent with a simulated rate limit. */
const MOCK_RETRY_AFTER_SECONDS = 30;

const SIMULATED_HTTP_ERRORS: Record<Exclude<MockErrorScenario, 'timeout'>, { status: number; message: string }> = {
  invalid_key: { status: 401, message: 'Incorrect API key provided.' },
  rate_limited: { status: 429, message: 'Rate limit reached for requests.' },
  provider_unavailable: { status: 503, message: 'The server is overloaded. Please try again later.' },
};

function simulatedHttpError(kind: Exclude<MockErrorScenario, 'timeout'>): ProviderError {
  const { status, message } = SIMULATED_HTTP_ERRORS[kind];
  return new ProviderError(`Mock API error: ${status} ${message}`, kind, {
    status,
    retryAfterSeconds: kind === 'rate_limited' ? MOCK_RETRY_AFTER_SECONDS : undefined,
  });
}

const LOREM_IPSUM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
  'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
  'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam',
  'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip',
  'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in',
  'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla',
  'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident',
  'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id',
  'est', 'laborum', 'sed', 'perspiciatis', 'unde', 'omnis', 'iste', 'natus',
  'error', 'voluptatem', 'accusantium', 'doloremque', 'laudantium', 'totam',
  'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo', 'inventore',
  'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta', 'explicabo',
  'nemo', 'enim', 'ipsam', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit',
];

/**
 * Mock answers for the majority vote extraction call: one short answer per
 * response label ([R1], [R2], ...) in the prompt. All agree on "42" except
 * the last of three or more, so a mock run shows a winner and a dissent.
 */
function mockFinalAnswers(prompt: string): { id: string; kind: string; answer: string }[] {
  const labels = [...new Set([...prompt.matchAll(/\[(R\d+)\]/g)].map((match) => match[1]!))];
  return labels.map((id, index) => ({
    id,
    kind: 'number',
    answer: labels.length >= 3 && index === labels.length - 1 ? '41' : '42',
  }));
}

export class MockProviderClient implements AIProvider {
  private readonly config: MockClientResolvedConfig;

  constructor(config: MockClientConfig = {}) {
    this.config = {
      enableErrors: config.enableErrors ?? false,
      errorProbability: config.errorProbability ?? 0,
      timeoutAfterMs: config.timeoutAfterMs ?? 30000,
      providerFilter: config.providerFilter,
      errorScenarios: config.errorScenarios,
    };
  }

  private scenarioFor(model: string): MockErrorScenario | undefined {
    const source = this.config.errorScenarios;
    if (typeof source === 'function') return source(model);
    return source?.[model] ?? source?.['*'];
  }

  async streamResponse(
    _prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number, tokenCount?: number) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void> {
    if (this.config.enableErrors && Math.random() < this.config.errorProbability) {
      onError(simulatedHttpError('rate_limited'));
      return;
    }

    const scenario = this.scenarioFor(model);
    if (scenario === 'timeout') {
      // A stream that starts, then stalls until the client gives up.
      onChunk(this.generateLoremIpsum(12));
      const timeoutMs = options?.timeoutMs ?? MOCK_TIMEOUT_MS;
      await this.sleep(timeoutMs);
      onError(
        new ProviderError(
          `Streaming timeout for mock after ${Math.round(timeoutMs / 1000)}s. The API may be unresponsive.`,
          'timeout',
        ),
      );
      return;
    }
    if (scenario) {
      await this.sleep(this.randomInt(100, 200));
      onError(simulatedHttpError(scenario));
      return;
    }

    const startTime = Date.now();

    try {
      const wordCount = this.getWordCountForModel(model);
      const fullText = this.generateLoremIpsum(wordCount);
      const chunks = this.chunkText(fullText);

      for (const chunk of chunks) {
        const delay = this.randomInt(50, 100);
        await this.sleep(delay);
        onChunk(chunk);
      }

      const responseTime = Date.now() - startTime;
      // Mock token count as approximately word count * 1.3
      const tokenCount = Math.round(wordCount * 1.3);
      console.log(`[MockProviderClient] Completing stream. words=${wordCount}, tokens=${tokenCount}`);
      onComplete(fullText, responseTime, tokenCount);
    } catch (error) {
      onError(error as Error);
    }
  }

  generateEmbeddings(text: string): Promise<number[]> {
    const hash = this.simpleHash(text);
    const embedding = Array.from({ length: 1536 }, (_, i) => (Math.sin(hash + i) + 1) / 2);
    return Promise.resolve(embedding);
  }

  async validateApiKey(_apiKey: string): Promise<ValidationResult> {
    const delay = this.randomInt(100, 300);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return { valid: true };
  }

  async generateStructured<T>(
    prompt: string,
    model: string,
    schema: JsonSchema,
    _options?: GenerateStructuredOptions,
  ): Promise<StructuredResponse<T>> {
    const delay = this.randomInt(50, 150);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const scenario = this.scenarioFor(model);
    if (scenario === 'timeout') {
      throw new ProviderError('Structured call timed out (mock).', 'timeout');
    }
    if (scenario) throw simulatedHttpError(scenario);

    if (schema.name === 'final_answers') {
      const parsed = { answers: mockFinalAnswers(prompt) } as T;
      return { parsed, raw: JSON.stringify(parsed), responseTimeMs: delay };
    }

    // Build a deterministic response using the first enum value for each property
    const properties = (schema.schema as Record<string, unknown>).properties as
      | Record<string, { enum?: string[] }>
      | undefined;
    const result: Record<string, unknown> = {};
    if (properties) {
      for (const [key, prop] of Object.entries(properties)) {
        if (prop.enum && prop.enum.length > 0) {
          result[key] = prop.enum[0];
        }
      }
    }

    const parsed = result as T;
    const raw = JSON.stringify(parsed);
    return { parsed, raw, responseTimeMs: delay };
  }

  listAvailableModels(): ModelMetadata[] {
    // Ids match real provider ids so mock runs look like free-mode runs.
    // costPer1kTokens is the input price from each provider's pricing page
    // in November 2026 (peak rate for DeepSeek). Context windows are
    // approximate. Mock data only: nothing bills against these numbers.
    const allModels: ModelMetadata[] = [
      {
        id: 'gpt-6-astra',
        name: 'GPT-6 Astra',
        provider: 'openai',
        contextWindow: 1050000,
        costPer1kTokens: 0.01,
        modalities: ['text', 'image'],
      },
      {
        id: 'gpt-6-luna',
        name: 'GPT-6 Luna',
        provider: 'openai',
        contextWindow: 1050000,
        costPer1kTokens: 0.0001,
        modalities: ['text', 'image'],
      },
      {
        id: 'claude-opus-5-5',
        name: 'Claude Opus 5.5',
        provider: 'anthropic',
        contextWindow: 1000000,
        costPer1kTokens: 0.004,
        modalities: ['text', 'image'],
      },
      {
        id: 'claude-sonnet-5-5',
        name: 'Claude Sonnet 5.5',
        provider: 'anthropic',
        contextWindow: 1000000,
        costPer1kTokens: 0.002,
        modalities: ['text', 'image'],
      },
      {
        id: 'claude-haiku-5-5',
        name: 'Claude Haiku 5.5',
        provider: 'anthropic',
        contextWindow: 1000000,
        costPer1kTokens: 0.0001,
        modalities: ['text', 'image'],
      },
      {
        id: 'gemini-4-carbon',
        name: 'Gemini 4 Carbon',
        provider: 'google',
        contextWindow: 1000000,
        costPer1kTokens: 0.002,
        modalities: ['text', 'image', 'audio', 'video'],
      },
      {
        id: 'gemini-4-hydrogen',
        name: 'Gemini 4 Hydrogen',
        provider: 'google',
        contextWindow: 1000000,
        costPer1kTokens: 0.0015,
        modalities: ['text', 'image', 'audio', 'video'],
      },
      {
        id: 'grok-4.7',
        name: 'Grok 4.7',
        provider: 'xai',
        contextWindow: 500000,
        costPer1kTokens: 0.002,
        modalities: ['text'],
      },
      {
        id: 'grok-4.3',
        name: 'Grok 4.3',
        provider: 'xai',
        contextWindow: 1000000,
        costPer1kTokens: 0.00125,
        modalities: ['text'],
      },
      {
        id: 'deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        provider: 'deepseek',
        contextWindow: 1000000,
        costPer1kTokens: 0.00132,
        modalities: ['text'],
      },
      {
        id: 'deepseek-flash',
        name: 'DeepSeek Flash',
        provider: 'deepseek',
        contextWindow: 1000000,
        costPer1kTokens: 0.0003,
        modalities: ['text'],
      },
      {
        id: 'perplexity-fast',
        name: 'Perplexity Fast',
        provider: 'perplexity',
        contextWindow: 128000,
        costPer1kTokens: 0.001,
        modalities: ['text'],
      },
      {
        id: 'perplexity-low',
        name: 'Perplexity Low',
        provider: 'perplexity',
        contextWindow: 128000,
        costPer1kTokens: 0.003,
        modalities: ['text'],
      },
    ];

    if (this.config.providerFilter) {
      return allModels.filter((model) => model.provider === this.config.providerFilter);
    }

    return allModels;
  }

  listAvailableTextModels(): Promise<string[]> {
    return Promise.resolve(this.listAvailableModels().map((model) => model.name));
  }

  private getWordCountForModel(model: string): number {
    const ranges: Record<string, [number, number]> = {
      'gpt-6-astra': [750, 1000],
      'gpt-6-luna': [600, 800],
      'claude-opus-5-5': [800, 1000],
      'claude-sonnet-5-5': [700, 900],
      'claude-haiku-5-5': [550, 750],
      'gemini-4-carbon': [700, 950],
      'gemini-4-hydrogen': [600, 800],
      'grok-4.7': [700, 900],
      'grok-4.3': [550, 750],
      'deepseek-v4-pro': [700, 900],
      'deepseek-flash': [550, 750],
      'perplexity-fast': [600, 800],
      'perplexity-low': [700, 900],
    };

    const [min, max] = ranges[model] ?? [600, 800];
    return this.randomInt(min, max);
  }

  private generateLoremIpsum(wordCount: number): string {
    const words: string[] = [];
    for (let i = 0; i < wordCount; i += 1) {
      const index = this.randomInt(0, LOREM_IPSUM_WORDS.length - 1);
      const word = LOREM_IPSUM_WORDS[index];
      if (word) {
        words.push(word);
      }
    }
    return words.join(' ');
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      const chunkSize = this.randomInt(50, 100);
      const chunk = remaining.slice(0, chunkSize);
      chunks.push(chunk);
      remaining = remaining.slice(chunkSize);
    }

    return chunks;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
