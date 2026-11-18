import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "~/store";
import { logger } from "~/lib/logger";
import { toError } from "~/lib/errors";
import { deleteRun, listRuns, saveRun, type StoredRun } from "~/lib/runHistory";
import {
  restoredRunState,
  runRecordId,
  toStoredRun,
  type RunRecordExtras,
} from "~/lib/runHistoryRecord";

export interface UseRunHistoryOptions {
  /** False in Pro mode, where history will live on the server. */
  enabled: boolean;
  /** Agreement and cost of the run on screen, worked out by the workspace. */
  extras: RunRecordExtras;
  /** Called before a stored run replaces the one on screen. */
  onOpen: () => void;
}

function warn(action: string) {
  return (error: unknown) =>
    logger.warn(`Run history: ${action} failed`, toError(error));
}

/**
 * Past runs kept in IndexedDB (Free mode). A run is written once every
 * answer is in, and written again as its agreement or consensus arrives.
 * `open` puts a stored run back on screen read only; `remove` deletes one
 * and clears the screen when it was the run shown.
 */
export function useRunHistory({
  enabled,
  extras,
  onOpen,
}: UseRunHistoryOptions) {
  const [runs, setRuns] = useState<StoredRun[]>([]);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const startedAt = useStore((s) => s.runStartedAt);
  const historyView = useStore((s) => s.historyView);
  const responses = useStore((s) => s.responses);
  const manual = useStore((s) => s.manualResponses);
  const metaAnalysis = useStore((s) => s.metaAnalysis);
  const embeddings = useStore((s) => s.embeddings);
  const majorityVote = useStore((s) => s.majorityVote);
  const { agreementScore, agreementLevel, costUsd } = extras;

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    // Queued like the writes, so a write made meanwhile is not lost from the list.
    writes.current = writes.current
      .then(listRuns)
      .then((stored) => {
        if (live) setRuns(stored);
      })
      .catch(warn("loading"));
    return () => {
      live = false;
    };
  }, [enabled]);

  // The record is built from the state of this render and written at once,
  // so a question asked right after the consensus arrives cannot drop it.
  // Writes are chained so they reach IndexedDB in order.
  useEffect(() => {
    if (!enabled) return;
    const record = toStoredRun(useStore.getState(), {
      agreementScore,
      agreementLevel,
      costUsd,
    });
    if (!record) return;
    writes.current = writes.current
      .then(() => saveRun(record))
      .then(() =>
        setRuns((prev) =>
          [record, ...prev.filter((r) => r.id !== record.id)].sort(
            (a, b) => b.createdAt - a.createdAt,
          ),
        ),
      )
      .catch(warn("saving"));
  }, [
    enabled,
    startedAt,
    responses,
    manual,
    metaAnalysis,
    embeddings,
    majorityVote,
    agreementScore,
    agreementLevel,
    costUsd,
  ]);

  const currentId =
    historyView?.id ?? (startedAt !== null ? runRecordId(startedAt) : null);

  const open = useCallback(
    (id: string) => {
      const run = runs.find((r) => r.id === id);
      if (!run) return;
      onOpen();
      useStore.setState(restoredRunState(run));
    },
    [runs, onOpen],
  );

  const remove = useCallback(
    async (id: string) => {
      if (id === currentId) {
        const state = useStore.getState();
        state.resetStreamingState();
        state.clearManualResponses();
        state.setPrompt("");
      }
      setRuns((prev) => prev.filter((r) => r.id !== id));
      // After any write still queued, so a late write cannot bring it back.
      writes.current = writes.current
        .then(() => deleteRun(id))
        .catch(warn("deleting"));
      await writes.current;
    },
    [currentId],
  );

  return { runs, currentId, open, remove };
}
