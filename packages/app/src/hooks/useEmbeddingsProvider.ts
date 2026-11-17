import { useMemo } from "react";
import { useStore } from "~/store";
import {
  resolveEmbeddingsProvider,
  type EmbeddingProvider,
} from "~/lib/embeddingsProvider";
import { embeddingStatuses } from "~/lib/endpointStatus";

/**
 * Provider used for agreement embeddings with the current keys and
 * preference, or null when none is available.
 */
export function useEmbeddingsProvider(): EmbeddingProvider | null {
  const embeddingsPreference = useStore((state) => state.embeddingsProvider);
  const apiKeys = useStore((state) => state.apiKeys);
  const endpoints = useStore((state) => state.endpoints);

  return useMemo(() => {
    const statuses = embeddingStatuses(apiKeys, endpoints);
    return resolveEmbeddingsProvider({
      preference: embeddingsPreference,
      statuses,
    });
  }, [apiKeys, endpoints, embeddingsPreference]);
}
