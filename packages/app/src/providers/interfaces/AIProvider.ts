/**
 * AIProvider Interface
 *
 * Abstract interface for all AI provider implementations.
 * Supports three client modes:
 * - MockAPIClient (Phase 2): Lorem ipsum streaming for UI development
 * - FreeAPIClient (Phase 3): Direct API calls with user-supplied keys
 * - ProAPIClient (Phase 4): Backend-managed API calls with credit system
 *
 * @see packages/app/docs/PROVIDER_ARCHITECTURE.md
 */

/**
 * Model metadata
 */
export interface ModelMetadata {
  /** Unique model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet') */
  id: string;
  /** Display name */
  name: string;
  /** Provider name */
  provider: 'openai' | 'anthropic' | 'google' | 'xai';
  /** Context window size in tokens */
  contextWindow: number;
  /** Cost per 1000 tokens (USD) */
  costPer1kTokens: number;
}

/**
 * API key validation result
 */
export interface ValidationResult {
  /** Whether the API key is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Abstract AIProvider interface
 *
 * All provider implementations (Mock, Free, Pro) must implement this interface.
 */
export interface AIProvider {
  /**
   * Stream a response from the AI model
   *
   * @param prompt - User input text
   * @param model - Model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet')
   * @param onChunk - Callback invoked for each streaming chunk
   * @param onComplete - Callback invoked when streaming completes
   * @param onError - Callback invoked if an error occurs
   * @returns Promise that resolves when streaming is complete
   *
   * @example
   * ```typescript
   * await provider.streamResponse(
   *   'What is AI?',
   *   'gpt-4o',
   *   (chunk) => console.log('Chunk:', chunk),
   *   (fullResponse, responseTime) => console.log('Complete:', responseTime),
   *   (error) => console.error('Error:', error)
   * );
   * ```
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
   *
   * @param text - Text to generate embeddings for
   * @returns Promise resolving to embedding vector (1536 dimensions)
   *
   * @example
   * ```typescript
   * const embedding = await provider.generateEmbeddings('Lorem ipsum dolor sit amet');
   * console.log(embedding.length); // 1536
   * ```
   */
  generateEmbeddings(text: string): Promise<number[]>;

  /**
   * Validate API key (Free mode only)
   *
   * @param apiKey - API key to validate
   * @returns Promise resolving to validation result
   *
   * @example
   * ```typescript
   * const result = await provider.validateApiKey('sk-...');
   * if (result.valid) {
   *   console.log('Valid API key');
   * } else {
   *   console.error('Invalid:', result.error);
   * }
   * ```
   */
  validateApiKey(apiKey: string): Promise<ValidationResult>;

  /**
   * List available models for this provider
   *
   * @returns Array of model metadata
   *
   * @example
   * ```typescript
   * const models = provider.listAvailableModels();
   * models.forEach(model => {
   *   console.log(`${model.name}: ${model.contextWindow} tokens`);
   * });
   * ```
   */
  listAvailableModels(): ModelMetadata[];
}
