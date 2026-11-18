/**
 * Provider names. `openai-compatible` covers every configured OpenAI-compatible
 * endpoint (Ollama, LM Studio, OpenRouter and others); its model ids carry the
 * endpoint id as a prefix (see clients/openaiCompatible/endpointPresets.ts).
 */
export type ProviderName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'deepseek'
  | 'perplexity'
  | 'openai-compatible';
export type ProviderMode = 'mock' | 'free' | 'pro';
export type ModelModality = 'text' | 'image' | 'audio' | 'video';

export interface ModelMetadata {
  id: string;
  name: string;
  provider: ProviderName;
  contextWindow: number;
  costPer1kTokens: number;
  modalities?: ModelModality[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface StreamResponseOptions {
  temperature?: number;
  seed?: number;
  /**
   * Client-side limit for the whole stream, in milliseconds. When it passes,
   * onError gets a ProviderError of kind `timeout`. Defaults to
   * DEFAULT_STREAM_TIMEOUT_MS (120 s).
   */
  timeoutMs?: number;
  /**
   * Cancels the call. The request is aborted where the client can (fetch
   * based clients), and onError gets a ProviderError of kind `cancelled`.
   */
  signal?: AbortSignal;
  /** Most output tokens the model may produce (`max_tokens`). Pro mode sets it from the run's token budget. */
  maxTokens?: number;
}

export interface JsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface GenerateStructuredOptions {
  temperature?: number;
  /** Cancels the call; it then rejects with a ProviderError of kind `cancelled`. */
  signal?: AbortSignal;
  /** Most output tokens the model may produce. */
  maxTokens?: number;
}

export interface GenerateEmbeddingsOptions {
  /** Cancels the call. */
  signal?: AbortSignal;
}

/**
 * Tokens billed for one call, as the provider reported them. Hidden
 * reasoning tokens count as output.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredResponse<T> {
  parsed: T;
  raw: string;
  responseTimeMs: number;
  tokenCount?: number;
  usage?: TokenUsage;
}

export interface AIProvider {
  streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (
      fullResponse: string,
      responseTime: number,
      tokenCount?: number,
      usage?: TokenUsage,
    ) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void>;

  generateEmbeddings(text: string, options?: GenerateEmbeddingsOptions): Promise<number[]>;

  validateApiKey(apiKey: string): Promise<ValidationResult>;

  listAvailableModels(): ModelMetadata[];

  /**
   * List available text-generation models for provider. Implementations should
   * attempt to query the provider API when an API key is available and fall
   * back to a reasonable default list when it is not.
   */
  listAvailableTextModels(): Promise<string[]>;

  /**
   * Generate a structured (JSON) response constrained to the given schema.
   * Uses provider-native structured output (e.g. json_schema, tool_use).
   * Non-streaming — returns the complete parsed result.
   */
  generateStructured<T>(
    prompt: string,
    model: string,
    schema: JsonSchema,
    options?: GenerateStructuredOptions,
  ): Promise<StructuredResponse<T>>;
}
