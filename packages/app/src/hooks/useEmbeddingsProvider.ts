import { useMemo } from "react";
import { useStore } from "~/store";
import type { EmbeddingProvider } from "~/lib/embeddingsProvider";
import { workspaceEmbeddingsProvider } from "~/lib/proMode";

/**
 * Provider used for agreement embeddings with the current mode, keys and
 * preference, or null when none is available.
 */
export function useEmbeddingsProvider(): EmbeddingProvider | null {
  const embeddingsPreference = useStore((state) => state.embeddingsProvider);
  const apiKeys = useStore((state) => state.apiKeys);
  const endpoints = useStore((state) => state.endpoints);
  const mode = useStore((state) => state.mode);

  return useMemo(
    () =>
      workspaceEmbeddingsProvider({
        mode,
        preference: embeddingsPreference,
        apiKeys,
        endpoints,
      }),
    [mode, apiKeys, endpoints, embeddingsPreference],
  );
}
