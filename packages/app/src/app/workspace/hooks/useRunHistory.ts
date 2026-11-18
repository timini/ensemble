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

/** Clears the run on screen and the composer, as New question does. */
function clearScreen() {
  const state = useStore.getState();
  state.resetStreamingState();
  state.clearManualResponses();
  state.setPrompt("");
}

/** True when `built` holds exactly what `existing` holds, apart from its stamp. */
function sameRun(existing: StoredRun | undefined, built: StoredRun): boolean {
  if (!existing) return false;
  const { updatedAt: _stamp, ...rest } = existing;
  return JSON.stringify(rest) === JSON.stringify(built);
}

function warn(action: string) {
  return (error: unknown) =>
    logger.warn(`Run history: ${action} failed`, toError(error));
}

/**
 * Past runs kept in IndexedDB (Free mode). A run is written once every
 * answer is in, and written again as its agreement or consensus arrives.
 * `open` puts a stored run back on screen read only, except while the live
 * run is still streaming (it is not stored yet); `remove` deletes one
 * and clears the screen when it was the run shown.
 */
export function useRunHistory({
  enabled,
  extras,
  onOpen,
}: UseRunHistoryOptions) {
  const [runs, setRuns] = useState<StoredRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const runsRef = useRef(runs);
  runsRef.current = runs;
  const writes = useRef<Promise<void>>(Promise.resolve());
  /** Runs as stored in IndexedDB, kept in step inside the write chain. */
  const stored = useRef(new Map<string, StoredRun>());
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
      .then((list) => {
        stored.current = new Map(list.map((r) => [r.id, r]));
        if (!live) return;
        setRuns(list);
        setLoaded(true);
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
    const built = toStoredRun(useStore.getState(), {
      agreementScore,
      agreementLevel,
      costUsd,
    });
    if (!built) return;
    writes.current = writes.current
      .then(async () => {
        // A record that changed nothing (the last run on a reload) is not
        // written, so its sync stamp stays put and cannot outrun a delete
        // made on another device.
        if (sameRun(stored.current.get(built.id), built)) return;
        const record: StoredRun = { ...built, updatedAt: Date.now() };
        await saveRun(record);
        stored.current.set(record.id, record);
        setRuns((prev) =>
          [record, ...prev.filter((r) => r.id !== record.id)].sort(
            (a, b) => b.createdAt - a.createdAt,
          ),
        );
      })
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
  const currentRef = useRef(currentId);
  currentRef.current = currentId;

  const open = useCallback(
    (id: string) => {
      const run = runs.find((r) => r.id === id);
      if (!run) return;
      // A live run still streaming is not stored yet: replacing it would
      // drop its answers, so it has to finish first.
      if (useStore.getState().responses.some((r) => r.isStreaming)) return;
      onOpen();
      useStore.setState(restoredRunState(run));
    },
    [runs, onOpen],
  );

  const remove = useCallback(
    async (id: string) => {
      if (id === currentId) clearScreen();
      setRuns((prev) => prev.filter((r) => r.id !== id));
      // After any write still queued, so a late write cannot bring it back.
      writes.current = writes.current
        .then(async () => {
          await deleteRun(id);
          stored.current.delete(id);
        })
        .catch(warn("deleting"));
      await writes.current;
    },
    [currentId],
  );

  /**
   * Replaces the stored runs with `next` (synced history after sign-in):
   * runs not in it are deleted, new or changed ones are written.
   */
  const replaceRuns = useCallback((next: StoredRun[]) => {
    const keep = new Set(next.map((r) => r.id));
    const previous = runsRef.current;
    // The run on screen was deleted on another device: clear it, as a delete
    // here would, so it is not listed or stored again.
    const shown = currentRef.current;
    if (shown && !keep.has(shown) && previous.some((r) => r.id === shown))
      clearScreen();
    setRuns([...next].sort((a, b) => b.createdAt - a.createdAt));
    writes.current = writes.current
      .then(async () => {
        const before = new Map(previous.map((r) => [r.id, r]));
        for (const r of previous)
          if (!keep.has(r.id)) {
            await deleteRun(r.id);
            stored.current.delete(r.id);
          }
        for (const r of next)
          if (before.get(r.id) !== r) {
            await saveRun(r);
            stored.current.set(r.id, r);
          }
      })
      .catch(warn("syncing"));
    return writes.current;
  }, []);

  return { runs, loaded, currentId, open, remove, replaceRuns };
}
