import { embeddingsHttpError } from './httpError';
import { GEMINI_BASE_URL } from './models';

export interface GeminiEmbeddingRequest {
  apiKey: string;
  /** Gemini embedding model id, without the `models/` prefix. */
  model: string;
  text: string;
  /** Injected fetch, for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

interface GeminiEmbedContentResponse {
  embedding?: { values?: number[] };
}

/**
 * Output size requested from Gemini. The model's default is 3072. Embeddings
 * are persisted in localStorage, so a smaller vector keeps the store small;
 * the model supports truncated (MRL) outputs, so 768 still scores well.
 */
export const GEMINI_EMBEDDING_DIMENSIONS = 768;

/**
 * Call the Gemini `models/{model}:embedContent` REST method for one text,
 * asking for `GEMINI_EMBEDDING_DIMENSIONS` values.
 */
export async function requestGeminiEmbedding({
  apiKey,
  model,
  text,
  fetchImpl,
  signal,
}: GeminiEmbeddingRequest): Promise<number[]> {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  const response = await doFetch(`${GEMINI_BASE_URL}/models/${model}:embedContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
    }),
    signal,
  });

  if (!response.ok) {
    throw await embeddingsHttpError(model, response);
  }

  const body = (await response.json()) as GeminiEmbedContentResponse;
  const values = body.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${model} returned no embedding.`);
  }
  return values;
}
