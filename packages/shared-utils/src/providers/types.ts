export type ProviderName = 'openai' | 'anthropic' | 'google' | 'xai';
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
}

export interface JsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface GenerateStructuredOptions {
  temperature?: number;
}

export interface StructuredResponse<T> {
  parsed: T;
  raw: string;
  responseTimeMs: number;
  tokenCount?: number;
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
    ) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void>;

  generateEmbeddings(text: string): Promise<number[]>;

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
