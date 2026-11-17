import { useMemo } from "react";
import { useStore } from "~/store";
import {
  normalizeEmbeddingsPreference,
  resolveEmbeddingsProvider,
  type EmbeddingProvider,
  type EmbeddingsProviderPreference,
} from "~/lib/embeddingsProvider";

/**
 * State and handler for the embeddings provider setting on the config page.
 *
 * @param statuses - key validation status per provider
 */
export function useEmbeddingsProviderSetting(
  statuses: Readonly<Record<string, string>>,
) {
  const stored = useStore((state) => state.embeddingsProvider);
  const setEmbeddingsProvider = useStore(
    (state) => state.setEmbeddingsProvider,
  );

  const value = normalizeEmbeddingsPreference(stored);

  const available = useMemo<Record<EmbeddingProvider, boolean>>(
    () => ({
      openai: statuses.openai === "valid",
      google: statuses.google === "valid",
    }),
    [statuses.openai, statuses.google],
  );

  const activeProvider = resolveEmbeddingsProvider({
    preference: value,
    statuses,
  });

  const onChange = (next: EmbeddingsProviderPreference) => {
    setEmbeddingsProvider(next);
  };

  return { value, available, activeProvider, onChange };
}
