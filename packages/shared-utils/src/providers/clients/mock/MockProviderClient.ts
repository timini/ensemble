/**
 * MockProviderClient
 *
 * Mock AI provider implementation for UI development and automated testing.
 * Generates lorem ipsum text with streaming behaviour that mimics real APIs.
 */

import type { AIProvider, ModelMetadata, ValidationResult, ProviderName } from '../../types.js';

export interface MockClientConfig {
  enableErrors?: boolean;
  errorProbability?: number;
  timeoutAfterMs?: number;
  providerFilter?: ProviderName;
}

interface MockClientResolvedConfig {
  enableErrors: boolean;
  errorProbability: number;
  timeoutAfterMs: number;
  providerFilter?: ProviderName;
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

export class MockProviderClient implements AIProvider {
  private readonly config: MockClientResolvedConfig;

  constructor(config: MockClientConfig = {}) {
    this.config = {
      enableErrors: config.enableErrors ?? false,
      errorProbability: config.errorProbability ?? 0,
      timeoutAfterMs: config.timeoutAfterMs ?? 30000,
      providerFilter: config.providerFilter,
    };
  }

  async streamResponse(
    _prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    if (this.config.enableErrors && Math.random() < this.config.errorProbability) {
      onError(new Error('Rate limit exceeded. Please try again in 60 seconds.'));
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
      onComplete(fullText, responseTime);
    } catch (error) {
      onError(error as Error);
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const hash = this.simpleHash(text);
    return Array.from({ length: 1536 }, (_, i) => (Math.sin(hash + i) + 1) / 2);
  }

  async validateApiKey(_apiKey: string): Promise<ValidationResult> {
    const delay = this.randomInt(100, 300);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return { valid: true };
  }

  listAvailableModels(): ModelMetadata[] {
    const allModels: ModelMetadata[] = [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        contextWindow: 128000,
        costPer1kTokens: 0.005,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        contextWindow: 128000,
        costPer1kTokens: 0.00015,
      },
      {
        id: 'o1-preview',
        name: 'o1 Preview',
        provider: 'openai',
        contextWindow: 128000,
        costPer1kTokens: 0.003,
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        costPer1kTokens: 0.003,
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextWindow: 200000,
        costPer1kTokens: 0.015,
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextWindow: 200000,
        costPer1kTokens: 0.0015,
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        contextWindow: 1000000,
        costPer1kTokens: 0.00125,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        contextWindow: 1000000,
        costPer1kTokens: 0.000075,
      },
      {
        id: 'grok-2',
        name: 'Grok 2',
        provider: 'xai',
        contextWindow: 128000,
        costPer1kTokens: 0.002,
      },
      {
        id: 'grok-2-mini',
        name: 'Grok 2 Mini',
        provider: 'xai',
        contextWindow: 128000,
        costPer1kTokens: 0.0002,
      },
    ];

    if (this.config.providerFilter) {
      return allModels.filter((model) => model.provider === this.config.providerFilter);
    }

    return allModels;
  }

  async listAvailableTextModels(): Promise<string[]> {
    return this.listAvailableModels().map((model) => model.name);
  }

  private getWordCountForModel(model: string): number {
    const ranges: Record<string, [number, number]> = {
      'gpt-4o': [750, 1000],
      'gpt-4o-mini': [600, 800],
      'o1-preview': [650, 850],
      'claude-3-5-sonnet': [700, 900],
      'claude-3-opus': [800, 1000],
      'claude-3-haiku': [550, 750],
      'gemini-1.5-pro': [700, 950],
      'gemini-1.5-flash': [600, 800],
      'grok-2': [700, 900],
      'grok-2-mini': [550, 750],
    };

    const [min, max] = ranges[model] ?? [600, 800];
    return this.randomInt(min, max);
  }

  private generateLoremIpsum(wordCount: number): string {
    const words: string[] = [];
    for (let i = 0; i < wordCount; i += 1) {
      const index = this.randomInt(0, LOREM_IPSUM_WORDS.length - 1);
      words.push(LOREM_IPSUM_WORDS[index]!);
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
      hash = (hash << 5) - hash + text.charCodeAt(i)!;
      hash |= 0;
    }
    return hash;
  }
}
