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
 * The choice comes from the valid keys: the override when its key is valid,
 * then OpenAI, then Google. Returns null when no embedding provider is
 * available. Mock mode follows the same rule (mock keys validate as valid),
 * so a mock run without an OpenAI or Google key shows the no-score message
 * as a Free run would.
 */
export function resolveEmbeddingsProvider({
  preference,
  statuses,
}: ResolveEmbeddingsProviderOptions): EmbeddingProvider | null {
  return selectEmbeddingsProvider(
    normalizeEmbeddingsPreference(preference),
    getValidProviders(statuses),
  );
}
