/**
 * Embed answers with one embedding model, as the app does, for agreement
 * calibration. Specs: `openai:text-embedding-3-small`,
 * `google:gemini-embedding-2`, or an OpenAI-compatible endpoint
 * (`ollama:nomic-embed-text`, `compat:<baseURL>#<model>`).
 */
import {
  GOOGLE_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_MODEL,
  createProviderClient,
  type AIProvider,
  type ProviderName,
} from '@ensemble-ai/shared-utils/providers';
import { embeddingModelKey } from '@ensemble-ai/shared-utils/similarity';
import { parseModelSpec } from '../modelSpecs.js';
import { endpointConfigs, getApiKeyForProvider } from '../providers.js';
import type { EvalMode } from '../../types.js';

const FIXED_MODELS: Partial<Record<string, string>> = {
  openai: OPENAI_EMBEDDING_MODEL,
  google: GOOGLE_EMBEDDING_MODEL,
};

export interface Embedder {
  /** Calibration key (`openai/text-embedding-3-small`, `ollama/nomic-embed-text`). */
  key: string;
  /** Provider and model id for pricing. */
  provider: string;
  model: string;
  embed: (text: string) => Promise<number[]>;
}

/** An embedder for `spec`. Key providers must name the model the app uses. */
export function createEmbedder(spec: string, mode: EvalMode): Embedder {
  const parsed = parseModelSpec(spec);
  if (parsed.endpoint) {
    const model = parsed.model.slice(parsed.endpoint.id.length + 1);
    const [config] = endpointConfigs([parsed.endpoint]);
    const client: AIProvider = createProviderClient({
      provider: 'openai-compatible',
      mode,
      getEndpoints: () => [{ ...config!, embeddingModel: model }],
    });
    return {
      key: embeddingModelKey(parsed.endpoint.id, model),
      provider: parsed.provider,
      model: parsed.model,
      embed: (text) => client.generateEmbeddings(text),
    };
  }
  const fixed = FIXED_MODELS[parsed.provider];
  if (!fixed) throw new Error(`${parsed.provider} has no embedding model the app uses.`);
  if (parsed.model !== fixed) {
    throw new Error(`The app embeds with ${parsed.provider}:${fixed}, not ${parsed.model}.`);
  }
  if (mode === 'free' && !getApiKeyForProvider(parsed.provider)) {
    throw new Error(`Missing API key for "${parsed.provider}".`);
  }
  const client = createProviderClient({
    provider: parsed.provider as ProviderName,
    mode,
    getApiKey: () => getApiKeyForProvider(parsed.provider),
  });
  return {
    key: embeddingModelKey(parsed.provider, fixed),
    provider: parsed.provider,
    model: fixed,
    embed: (text) => client.generateEmbeddings(text),
  };
}
