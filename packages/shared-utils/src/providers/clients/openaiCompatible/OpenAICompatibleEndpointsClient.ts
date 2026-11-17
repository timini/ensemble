import type {
  AIProvider,
  GenerateStructuredOptions,
  JsonSchema,
  ModelMetadata,
  StreamResponseOptions,
  StructuredResponse,
  TokenUsage,
  ValidationResult,
} from '../../types';
import { ProviderError } from '../../errors/providerError';
import { EmbeddingsNotSupportedError } from '../../embeddings/errors';
import { FreeOpenAICompatibleClient } from './FreeOpenAICompatibleClient';
import { parseEndpointModelId, toEndpointModelId } from './endpointPresets';

/** Provider name shared by every OpenAI-compatible endpoint. */
export const OPENAI_COMPATIBLE_PROVIDER = 'openai-compatible' as const;

/** One configured endpoint, with its key already decrypted. */
export interface OpenAICompatibleEndpointConfig {
  /** Endpoint id, the prefix of its qualified model ids (see endpointPresets.ts). */
  id: string;
  baseURL: string;
  /** Empty for servers that need no key. */
  apiKey: string;
  /** Embedding model on this server, for agreement scoring. */
  embeddingModel?: string;
}

export interface OpenAICompatibleEndpointsClientOptions {
  /** Injected fetch, for tests. */
  fetchImpl?: typeof fetch;
}

function notConfigured(model: string): ProviderError {
  return new ProviderError(
    `No configured OpenAI-compatible endpoint for model "${model}". Check the endpoint on the configuration page.`,
    'other',
    { provider: OPENAI_COMPATIBLE_PROVIDER },
  );
}

/**
 * The `openai-compatible` provider: one AIProvider over every configured
 * endpoint. Model ids are qualified (`ollama/llama3.2:3b`); each call goes to
 * the endpoint named by the prefix, with the bare model id. Endpoints are
 * read at call time, so edits on the configuration page apply at once.
 *
 * Embeddings use the first endpoint, in configuration order, that has an
 * embedding model set.
 */
export class OpenAICompatibleEndpointsClient implements AIProvider {
  constructor(
    private readonly getEndpoints: () => OpenAICompatibleEndpointConfig[],
    private readonly options: OpenAICompatibleEndpointsClientOptions = {},
  ) {}

  /** A single-endpoint client for this configuration. */
  clientFor(endpoint: OpenAICompatibleEndpointConfig): FreeOpenAICompatibleClient {
    return new FreeOpenAICompatibleClient(OPENAI_COMPATIBLE_PROVIDER, () => endpoint.apiKey, {
      getBaseURL: () => endpoint.baseURL,
      getEmbeddingModel: () => endpoint.embeddingModel,
      fetchImpl: this.options.fetchImpl,
    });
  }

  private resolve(qualifiedModel: string) {
    const parsed = parseEndpointModelId(qualifiedModel);
    const endpoint = parsed ? this.getEndpoints().find((e) => e.id === parsed.endpointId) : undefined;
    return parsed && endpoint ? { client: this.clientFor(endpoint), modelId: parsed.modelId } : null;
  }

  async streamResponse(
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number, tokenCount?: number, usage?: TokenUsage) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void> {
    const target = this.resolve(model);
    if (!target) {
      onError(notConfigured(model));
      return;
    }
    await target.client.streamResponse(prompt, target.modelId, onChunk, onComplete, onError, options);
  }

  async generateStructured<T>(
    prompt: string,
    model: string,
    schema: JsonSchema,
    options?: GenerateStructuredOptions,
  ): Promise<StructuredResponse<T>> {
    const target = this.resolve(model);
    if (!target) throw notConfigured(model);
    return target.client.generateStructured<T>(prompt, target.modelId, schema, options);
  }

  /** The endpoint used for embeddings, or undefined when none has an embedding model. */
  embeddingsEndpoint(): OpenAICompatibleEndpointConfig | undefined {
    return this.getEndpoints().find((endpoint) => endpoint.embeddingModel?.trim());
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const endpoint = this.embeddingsEndpoint();
    if (!endpoint) throw new EmbeddingsNotSupportedError(OPENAI_COMPATIBLE_PROVIDER);
    return this.clientFor(endpoint).generateEmbeddings(text);
  }

  /** Check that an endpoint answers `GET /models` with its key. */
  async validateEndpoint(endpoint: OpenAICompatibleEndpointConfig): Promise<ValidationResult> {
    return this.clientFor(endpoint).validateApiKey(endpoint.apiKey);
  }

  /** Valid when at least one configured endpoint answers. The key argument is not used. */
  async validateApiKey(_apiKey: string): Promise<ValidationResult> {
    const results = await Promise.all(this.getEndpoints().map((e) => this.validateEndpoint(e)));
    if (results.some((r) => r.valid)) return { valid: true };
    return { valid: false, error: results[0]?.error ?? 'No OpenAI-compatible endpoint is configured.' };
  }

  /** No static metadata: what a server offers is only known from its model list. */
  listAvailableModels(): ModelMetadata[] {
    return [];
  }

  async listAvailableTextModels(): Promise<string[]> {
    const lists = await Promise.all(
      this.getEndpoints().map(async (endpoint) => {
        const ids = await this.clientFor(endpoint).listAvailableTextModels();
        return ids.map((id) => toEndpointModelId(endpoint.id, id));
      }),
    );
    return lists.flat();
  }
}
