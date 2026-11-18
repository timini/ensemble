/**
 * Helpers for local model servers: finding a running Ollama, choosing an
 * embedding model from a server's model list, and telling when a failed call
 * to this machine was probably blocked by the browser.
 */
import { isLoopbackURL } from './endpointPresets';

/** Where Ollama listens by default (no `/v1`). */
export const OLLAMA_DEFAULT_URL = 'http://localhost:11434';

/** The embedding model suggested for Ollama when none is installed. */
export const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * Embedding models from the Ollama library, best first. nomic-embed-text is
 * small (274 MB) and the most pulled; the others are listed in Ollama's
 * embeddings docs (November 2026).
 */
const KNOWN_EMBEDDING_MODELS = [
  'nomic-embed-text',
  'embeddinggemma',
  'qwen3-embedding',
  'mxbai-embed-large',
  'snowflake-arctic-embed2',
  'snowflake-arctic-embed',
  'bge-m3',
  'bge-large',
  'granite-embedding',
  'paraphrase-multilingual',
  'all-minilm',
] as const;

/** Model name without its tag or namespace (`library/qwen3-embedding:0.6b` gives `qwen3-embedding`). */
function baseName(modelId: string): string {
  const withoutTag = modelId.trim().toLowerCase().replace(/:[^/]*$/, '');
  return withoutTag.slice(withoutTag.lastIndexOf('/') + 1);
}

/** True when a model id names an embedding model rather than a chat model. */
export function isEmbeddingModelId(modelId: string): boolean {
  const name = baseName(modelId);
  if ((KNOWN_EMBEDDING_MODELS as readonly string[]).includes(name)) return true;
  return /embed/.test(modelId.toLowerCase());
}

/**
 * The embedding model to use from a server's model list: the preferred one
 * when it is there (returned as given), else the best known embedding model,
 * else any model whose id says `embed`. Undefined when there is none.
 */
export function pickEmbeddingModel(models: readonly string[], preferred?: string): string | undefined {
  const wanted = preferred?.trim().replace(/:latest$/, '');
  if (wanted && models.some((id) => id.replace(/:latest$/, '') === wanted)) return preferred!.trim();
  for (const known of KNOWN_EMBEDDING_MODELS) {
    const match = models.find((id) => baseName(id) === known);
    if (match) return match;
  }
  return models.find((id) => isEmbeddingModelId(id));
}

/** The command that installs an embedding model in Ollama. */
export function ollamaPullCommand(model: string = DEFAULT_OLLAMA_EMBEDDING_MODEL): string {
  return `ollama pull ${model}`;
}

export type OllamaDetection =
  | { found: false }
  | {
      found: true;
      /** Server root, without `/v1`. */
      url: string;
      /** OpenAI-compatible base URL for the endpoint, `${url}/v1`. */
      baseURL: string;
      /** Every installed model. */
      models: string[];
      /** Installed models that can answer prompts. */
      chatModels: string[];
      /** The installed embedding model to use, if any. */
      embeddingModel?: string;
    };

export interface DetectOllamaOptions {
  /** Server root. Defaults to OLLAMA_DEFAULT_URL. */
  url?: string;
  /** How long each probe may take. Defaults to 1500 ms. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

async function fetchJson(url: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method: 'GET', signal: controller.signal });
    if (!response.ok) return undefined;
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Model names from Ollama's `/api/tags` or an OpenAI `/v1/models` body. */
function modelNames(body: unknown): string[] | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const { models, data } = body as { models?: unknown; data?: unknown };
  const list = Array.isArray(models) ? models : Array.isArray(data) ? data : undefined;
  if (!list) return undefined;
  return list
    .map((entry: unknown) => {
      const e = (entry ?? {}) as { name?: unknown; model?: unknown; id?: unknown };
      return [e.name, e.model, e.id].find((v): v is string => typeof v === 'string' && v.length > 0);
    })
    .filter((name): name is string => name !== undefined);
}

/**
 * Look for a running Ollama with a short timeout. Tries Ollama's own
 * `/api/tags`, then `/v1/models`. Never throws and logs nothing: a server
 * that is absent, blocked by the browser or not Ollama gives `{ found: false }`.
 */
export async function detectOllama(options: DetectOllamaOptions = {}): Promise<OllamaDetection> {
  const url = (options.url ?? OLLAMA_DEFAULT_URL).trim().replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? 1500;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) return { found: false };

  let models = modelNames(await fetchJson(`${url}/api/tags`, timeoutMs, fetchImpl));
  models ??= modelNames(await fetchJson(`${url}/v1/models`, timeoutMs, fetchImpl));
  if (!models) return { found: false };

  const embeddingModel = pickEmbeddingModel(models);
  return {
    found: true,
    url,
    baseURL: `${url}/v1`,
    models,
    chatModels: models.filter((id) => !isEmbeddingModelId(id)),
    ...(embeddingModel ? { embeddingModel } : {}),
  };
}

/**
 * True when a failed call to `targetURL` was probably blocked by the browser
 * rather than refused by the server: the target is on this machine and the
 * page is not. Chrome and Firefox ask for local network permission first,
 * and Safari blocks `http://localhost` from an HTTPS page as mixed content
 * (docs/LOCAL_MODELS.md, Browser support).
 */
export function isLocalNetworkBlockLikely(targetURL: string, pageOrigin: string): boolean {
  return isLoopbackURL(targetURL) && !isLoopbackURL(pageOrigin);
}
