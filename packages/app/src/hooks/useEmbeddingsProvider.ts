import { useMemo } from "react";
import { useStore } from "~/store";
import {
  resolveEmbeddingsProvider,
  type EmbeddingProvider,
} from "~/lib/embeddingsProvider";

/**
 * Provider used for agreement embeddings with the current keys and
 * preference, or null when none is available.
 */
export function useEmbeddingsProvider(): EmbeddingProvider | null {
  const embeddingsPreference = useStore((state) => state.embeddingsProvider);
  const apiKeys = useStore((state) => state.apiKeys);

  return useMemo(() => {
    const statuses = Object.fromEntries(
      Object.entries(apiKeys).map(([provider, entry]) => [
        provider,
        entry?.status ?? "idle",
      ]),
    );
    return resolveEmbeddingsProvider({
      preference: embeddingsPreference,
      statuses,
    });
  }, [apiKeys, embeddingsPreference]);
}
