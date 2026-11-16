/** Providers with an embeddings API, in the order auto selection tries them. */
export const EMBEDDING_PROVIDERS = ['openai', 'google'] as const;

export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

/** User preference: a specific provider, or `auto`. */
export type EmbeddingsProviderPreference = 'auto' | EmbeddingProvider;

/** True when the provider can produce embeddings. */
export function isEmbeddingProvider(provider: string): provider is EmbeddingProvider {
  return (EMBEDDING_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * Choose the embeddings provider for a run.
 *
 * An explicit preference wins when its key is valid. Otherwise the first
 * provider in EMBEDDING_PROVIDERS with a valid key is used (OpenAI, then
 * Google). Returns null when no embedding-capable key is available, so the UI
 * can say so instead of showing a score.
 *
 * @param preference - stored user preference; unknown values count as `auto`
 * @param validProviders - providers whose API key has been validated
 */
export function selectEmbeddingsProvider(
  preference: string,
  validProviders: readonly string[],
): EmbeddingProvider | null {
  if (isEmbeddingProvider(preference) && validProviders.includes(preference)) {
    return preference;
  }
  return EMBEDDING_PROVIDERS.find((provider) => validProviders.includes(provider)) ?? null;
}
