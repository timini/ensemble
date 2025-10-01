/**
 * MockAPIClient
 *
 * Mock AI provider implementation for UI development and E2E testing.
 * Generates lorem ipsum text with streaming behavior that mimics real APIs.
 *
 * - Generates 500-1000 word lorem ipsum responses
 * - Streams in 50-100 character chunks
 * - 50-100ms delay between chunks
 * - Total streaming time: ~5-10 seconds
 *
 * @see packages/app/docs/MOCK_CLIENT_SPECIFICATION.md
 */

import type { AIProvider, ModelMetadata, ValidationResult } from '../interfaces/AIProvider';

/**
 * Mock client configuration
 */
export interface MockClientConfig {
  /** Enable error simulation (for testing) */
  enableErrors?: boolean;
  /** Probability of error occurring (0-1) */
  errorProbability?: number;
  /** Timeout in milliseconds */
  timeoutAfterMs?: number;
}

/**
 * Lorem ipsum word bank
 */
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
 * MockAPIClient implementation
 */
export class MockAPIClient implements AIProvider {
  private config: MockClientConfig;

  constructor(config: MockClientConfig = {}) {
    this.config = {
      enableErrors: config.enableErrors ?? false,
      errorProbability: config.errorProbability ?? 0.0,
      timeoutAfterMs: config.timeoutAfterMs ?? 30000,
    };
  }

  /**
   * Stream lorem ipsum response
   */
  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    // Simulate error if configured
    if (
      this.config.enableErrors &&
      Math.random() < this.config.errorProbability!
    ) {
      onError(new Error('Rate limit exceeded. Please try again in 60 seconds.'));
      return;
    }

    const startTime = Date.now();

    try {
      // Generate lorem ipsum text
      const wordCount = this.getWordCountForModel(model);
      const fullText = this.generateLoremIpsum(wordCount);

      // Split into chunks
      const chunks = this.chunkText(fullText);

      // Stream chunks with delays
      for (const chunk of chunks) {
        const delay = this.randomInt(50, 100);
        await this.sleep(delay);
        onChunk(chunk);
      }

      // Complete
      const responseTime = Date.now() - startTime;
      onComplete(fullText, responseTime);
    } catch (error) {
      onError(error as Error);
    }
  }

  /**
   * Generate mock embeddings
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    // Generate deterministic vector from text hash
    const hash = this.simpleHash(text);
    return Array.from({ length: 1536 }, (_, i) => {
      return (Math.sin(hash + i) + 1) / 2; // Normalize to [0, 1]
    });
  }

  /**
   * Validate API key (mock always returns valid after simulated network delay)
   */
  async validateApiKey(_apiKey: string): Promise<ValidationResult> {
    // Simulate network delay: 100-300ms
    const delay = this.randomInt(100, 300);
    await new Promise(resolve => setTimeout(resolve, delay));

    return { valid: true };
  }

  /**
   * List available mock models
   */
  listAvailableModels(): ModelMetadata[] {
    return [
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
        name: 'Grok-2',
        provider: 'xai',
        contextWindow: 128000,
        costPer1kTokens: 0.002,
      },
      {
        id: 'grok-2-mini',
        name: 'Grok-2 Mini',
        provider: 'xai',
        contextWindow: 128000,
        costPer1kTokens: 0.0002,
      },
    ];
  }

  /**
   * Get word count for specific model
   */
  private getWordCountForModel(model: string): number {
    const ranges: Record<string, [number, number]> = {
      'gpt-4o': [750, 1000],
      'gpt-4o-mini': [600, 800],
      'claude-3-5-sonnet': [700, 900],
      'claude-3-opus': [800, 1000],
      'gemini-1.5-pro': [600, 800],
      'gemini-1.5-flash': [500, 700],
      'grok-2': [600, 800],
      'grok-2-mini': [500, 700],
    };

    const [min, max] = ranges[model] ?? [500, 1000];
    return this.randomInt(min, max);
  }

  /**
   * Generate lorem ipsum text
   */
  private generateLoremIpsum(wordCount: number): string {
    const words: string[] = [];

    for (let i = 0; i < wordCount; i++) {
      const word = LOREM_IPSUM_WORDS[i % LOREM_IPSUM_WORDS.length]!;
      words.push(word);
    }

    // Add punctuation every 10-15 words
    let text = '';
    for (let i = 0; i < words.length; i++) {
      text += words[i];

      if ((i + 1) % this.randomInt(10, 15) === 0 && i < words.length - 1) {
        text += '. ';
        // Capitalize next word
        words[i + 1] =
          words[i + 1]!.charAt(0).toUpperCase() + words[i + 1]!.slice(1);
      } else if (i < words.length - 1) {
        text += ' ';
      }
    }

    // Ensure first word is capitalized
    text = text.charAt(0).toUpperCase() + text.slice(1);

    // End with period if needed
    if (!text.endsWith('.')) {
      text += '.';
    }

    return text;
  }

  /**
   * Chunk text into 50-100 character chunks
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let position = 0;

    while (position < text.length) {
      const chunkSize = this.randomInt(50, 100);
      const chunk = text.slice(position, position + chunkSize);
      chunks.push(chunk);
      position += chunkSize;
    }

    return chunks;
  }

  /**
   * Simple hash function
   */
  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Random integer between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
