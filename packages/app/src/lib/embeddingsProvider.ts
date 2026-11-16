import {
  EMBEDDING_PROVIDERS,
  selectEmbeddingsProvider,
  type EmbeddingProvider,
  type EmbeddingsProviderPreference,
} from "@ensemble-ai/shared-utils/providers";

export type { EmbeddingProvider, EmbeddingsProviderPreference };

interface ResolveEmbeddingsProviderOptions {
  /** Stored user preference (`auto`, `openai` or `google`). */
  preference: string;
  /** Validation status per provider, as kept in the API key slice. */
  statuses: Readonly<Record<string, string>>;
  /** True when NEXT_PUBLIC_MOCK_MODE is on. */
  mockMode: boolean;
}

/**
 * Map a stored value to a known preference. Older stores could hold any
 * provider name here; anything unknown becomes `auto`.
 */
export function normalizeEmbeddingsPreference(
  value: string | null | undefined,
): EmbeddingsProviderPreference {
  if (value === "auto") return "auto";
  return (EMBEDDING_PROVIDERS as readonly string[]).includes(value ?? "")
    ? (value as EmbeddingProvider)
    : "auto";
}

/** Providers whose key status is `valid`. */
export function getValidProviders(
  statuses: Readonly<Record<string, string>>,
): string[] {
  return Object.entries(statuses)
    .filter(([, status]) => status === "valid")
    .map(([provider]) => provider);
}

/**
 * Decide which provider computes embeddings for agreement scoring.
 *
 * In mock mode the mock client serves every provider, so the preference (or
 * OpenAI) is used. Otherwise the choice comes from the valid keys: the
 * override when its key is valid, then OpenAI, then Google. Returns null when
 * no embedding provider is available.
 */
export function resolveEmbeddingsProvider({
  preference,
  statuses,
  mockMode,
}: ResolveEmbeddingsProviderOptions): EmbeddingProvider | null {
  const normalized = normalizeEmbeddingsPreference(preference);
  if (mockMode) {
    return normalized === "auto" ? EMBEDDING_PROVIDERS[0] : normalized;
  }
  return selectEmbeddingsProvider(normalized, getValidProviders(statuses));
}
