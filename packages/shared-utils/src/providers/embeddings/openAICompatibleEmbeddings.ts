import { embeddingsHttpError } from './httpError';

export interface OpenAICompatibleEmbeddingRequest {
  /** API root, for example `https://api.openai.com/v1` or `http://localhost:11434/v1`. */
  baseURL: string;
  /** Bearer key. Optional so local servers (Ollama, LM Studio) work without one. */
  apiKey?: string | null;
  /** Embedding model id. */
  model: string;
  /** Text to embed. */
  input: string;
  /** Injected fetch, for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Optional abort signal. */
  signal?: AbortSignal;
}

interface OpenAIEmbeddingsResponse {
  data?: { embedding?: number[] }[];
}

/**
 * Call `POST {baseURL}/embeddings` on any OpenAI-compatible server and return
 * the vector for a single input. Used by the OpenAI client today and meant for
 * the OpenAI-compatible providers in M2 (Ollama, LM Studio, OpenRouter).
 */
export async function requestOpenAICompatibleEmbedding({
  baseURL,
  apiKey,
  model,
  input,
  fetchImpl,
  signal,
}: OpenAICompatibleEmbeddingRequest): Promise<number[]> {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await doFetch(`${baseURL.replace(/\/+$/, '')}/embeddings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, input }),
    signal,
  });

  if (!response.ok) {
    throw await embeddingsHttpError(model, response);
  }

  const body = (await response.json()) as OpenAIEmbeddingsResponse;
  const embedding = body.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error(`${model} returned no embedding.`);
  }
  return embedding;
}
