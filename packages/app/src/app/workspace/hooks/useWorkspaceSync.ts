import { useMemo } from "react";
import { useStore, type SavedEnsemble } from "~/store";
import { api } from "~/trpc/react";
import { useCollectionSync, type SyncApi } from "~/hooks/useCollectionSync";
import type { StoredRun } from "~/lib/runHistory";

export interface UseWorkspaceSyncOptions {
  /** The signed-in user, or null. */
  uid: string | null;
  history: {
    runs: StoredRun[];
    loaded: boolean;
    replaceRuns: (runs: StoredRun[]) => Promise<void>;
  };
  /** False before the store has loaded from localStorage. */
  hasHydrated: boolean;
}

/** A run without its embedding vectors, for a run too large to sync whole. */
function slimRun(run: StoredRun): StoredRun {
  return { ...run, embeddings: [] };
}

const runStamp = (run: StoredRun) => run.updatedAt ?? run.createdAt;
const presetStamp = (preset: SavedEnsemble) => preset.updatedAt ?? 0;

/**
 * Synced history and presets for a signed-in user (both modes). Signed
 * out, both stay in this browser only, as before. Keys are never part of
 * a run or a preset, and the sync strips any secret-looking field anyway.
 * Returns where the sidebar should say history is kept.
 */
export function useWorkspaceSync({
  uid,
  history,
  hasHydrated,
}: UseWorkspaceSyncOptions): "synced" | "local" {
  const utils = api.useUtils();
  const syncApi = useMemo<SyncApi>(
    () => ({
      list: (kind) => utils.client.sync.list.query({ kind }),
      upsert: (kind, items) => utils.client.sync.upsert.mutate({ kind, items }),
      remove: (kind, ids) => utils.client.sync.remove.mutate({ kind, ids }),
    }),
    [utils],
  );
  const savedEnsembles = useStore((s) => s.savedEnsembles);

  const historySynced = useCollectionSync<StoredRun>({
    kind: "history",
    uid,
    ready: history.loaded,
    items: history.runs,
    stamp: runStamp,
    apply: history.replaceRuns,
    api: syncApi,
    slim: slimRun,
  });
  useCollectionSync<SavedEnsemble>({
    kind: "presets",
    uid,
    ready: hasHydrated,
    items: savedEnsembles,
    stamp: presetStamp,
    apply: (merged) => useStore.setState({ savedEnsembles: merged }),
    api: syncApi,
  });

  return historySynced ? "synced" : "local";
}
