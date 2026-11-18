import { useEffect, useRef, useState } from "react";
import { logger } from "~/lib/logger";
import { toError } from "~/lib/errors";
import {
  mergeSync,
  parseSyncPayload,
  toSyncPayload,
} from "~/lib/sync/mergeSync";
import {
  SYNC_LIMITS,
  type SyncItem,
  type SyncKind,
  type SyncSnapshot,
} from "~/lib/sync/syncItems";

/** The account's copy, as the sync router serves it. */
export interface SyncApi {
  list: (kind: SyncKind) => Promise<SyncSnapshot>;
  upsert: (kind: SyncKind, items: SyncItem[]) => Promise<unknown>;
  remove: (kind: SyncKind, ids: string[]) => Promise<unknown>;
}

export interface UseCollectionSyncOptions<T extends { id: string }> {
  kind: SyncKind;
  /** The signed-in user, or null: nothing is synced while signed out. */
  uid: string | null;
  /** True once this browser's items have loaded. */
  ready: boolean;
  /** This browser's items. A new object for an item means it changed. */
  items: T[];
  /** Last change of an item, in epoch milliseconds. */
  stamp: (item: T) => number;
  /** Replaces this browser's items with the merged list. */
  apply: (merged: T[]) => void | Promise<void>;
  api: SyncApi;
  /** A smaller copy of an item to send when it is over the size limit. */
  slim?: (item: T) => T;
  /** Wait after a change before sending it, in ms. */
  debounceMs?: number;
  /** Wait after a failed send before trying it again, in ms. */
  retryMs?: number;
}

/** localStorage key naming the account this browser's items were last merged into. */
export const syncOwnerKey = (kind: SyncKind) =>
  `ensemble-ai-sync-owner-${kind}`;

function readOwner(kind: SyncKind): string | null {
  try {
    return localStorage.getItem(syncOwnerKey(kind));
  } catch {
    return null;
  }
}

function warn(kind: SyncKind, action: string) {
  return (error: unknown) =>
    logger.warn(`Sync (${kind}): ${action} failed`, toError(error));
}

/**
 * Keeps a list of items in this browser in step with the signed-in
 * account. On sign-in it merges the two copies (newest change wins,
 * a delete always wins) and uploads what the account lacks. If
 * this browser last synced with a different account, its items are not
 * uploaded: they are replaced by the new account's. After that, changes
 * and deletes here are sent after a short pause. Signed out, nothing is
 * sent and the items stay in this browser only.
 *
 * Returns true while the items are synced to the account.
 */
export function useCollectionSync<T extends { id: string }>(
  options: UseCollectionSyncOptions<T>,
): boolean {
  const { kind, uid, ready, items } = options;
  const opts = useRef(options);
  opts.current = options;
  /**
   * Items the account is known to hold, by id: as merged, then as each
   * write is acknowledged. Null until the first merge. A change or delete
   * stays out of it until the server accepts it, so a failed write is
   * sent again by a later flush.
   */
  const baseline = useRef<Map<string, T> | null>(null);
  const [syncedUid, setSyncedUid] = useState<string | null>(null);
  const latest = useRef(items);
  latest.current = items;
  /** This browser's list from before the merge, until `apply` replaces it. */
  const premerge = useRef<T[] | null>(null);
  /**
   * Bumped on every sign-in, sign-out and account change. Work started for
   * one session checks it after each await and stops once it has moved on,
   * so nothing of one account is written while another is signed in.
   */
  const session = useRef(0);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => undefined);

  const clearRetry = () => {
    if (retry.current) clearTimeout(retry.current);
    retry.current = null;
  };

  /**
   * Writes changes and deletes for the session `mine`, adding each to the
   * baseline once the server accepts it. Stops as soon as the session
   * ends. A failure is logged and the flush is tried again after `retryMs`.
   */
  const send = async (mine: number, changed: T[], removed: string[]) => {
    const alive = () => session.current === mine;
    const { api, slim } = opts.current;
    const max = SYNC_LIMITS[kind].maxBatch;
    const batch: { item: T; sync: SyncItem }[] = [];
    for (const item of changed) {
      const payload = toSyncPayload(kind, item, slim);
      if (payload)
        batch.push({
          item,
          sync: { id: item.id, updatedAt: opts.current.stamp(item), payload },
        });
      // Too large to store even slimmed: it can never be sent, so no retry.
      else baseline.current?.set(item.id, item);
    }
    try {
      for (let i = 0; i < batch.length; i += max) {
        if (!alive()) return;
        const part = batch.slice(i, i + max);
        await api.upsert(
          kind,
          part.map((p) => p.sync),
        );
        if (!alive()) return;
        for (const { item } of part) baseline.current?.set(item.id, item);
      }
      if (removed.length) {
        if (!alive()) return;
        await api.remove(kind, removed);
        if (!alive()) return;
        for (const id of removed) baseline.current?.delete(id);
      }
    } catch (error) {
      warn(kind, "sending")(error);
      if (!alive()) return;
      clearRetry();
      retry.current = setTimeout(() => {
        retry.current = null;
        if (alive()) flushRef.current();
      }, opts.current.retryMs ?? 30_000);
    }
  };

  // Merge on sign-in, once this browser's items have loaded.
  useEffect(() => {
    // A counter, not a DOM node: the cleanup must see its latest value.
    const sessions = session;
    const mine = ++sessions.current;
    const alive = () => sessions.current === mine;
    baseline.current = null;
    setSyncedUid(null);
    if (!uid || !ready) return;
    void (async () => {
      const { api, stamp, apply } = opts.current;
      const remote = await api.list(kind);
      if (!alive()) return;
      // Read after the list arrives, so changes made meanwhile are merged.
      premerge.current = latest.current;
      const owner = readOwner(kind);
      const local = owner && owner !== uid ? [] : latest.current;
      const { merged, upload } = mergeSync(
        local,
        remote,
        stamp,
        parseSyncPayload<T>,
      );
      // Items to upload are not on the account until the upload is accepted.
      const pending = new Set(upload.map((i) => i.id));
      baseline.current = new Map(
        merged.filter((i) => !pending.has(i.id)).map((i) => [i.id, i]),
      );
      await apply(merged);
      if (!alive()) return;
      await send(mine, upload, []);
      if (!alive()) return;
      try {
        localStorage.setItem(syncOwnerKey(kind), uid);
      } catch {
        // Storage blocked: the next sign-in merges again, which is safe.
      }
      setSyncedUid(uid);
    })().catch(warn(kind, "merging"));
    return () => {
      sessions.current++;
      clearRetry();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ready, kind]);

  /** Sends what the account has not acknowledged yet, if anything. */
  const flush = () => {
    const base = baseline.current;
    const current = latest.current;
    // Not replaced by the merged list yet: nothing has changed here.
    if (!base || current === premerge.current) return;
    const changed = current.filter((i) => base.get(i.id) !== i);
    const ids = new Set(current.map((i) => i.id));
    const removed = [...base.keys()].filter((id) => !ids.has(id));
    if (!changed.length && !removed.length) return;
    clearRetry();
    void send(session.current, changed, removed);
  };
  flushRef.current = flush;

  // Send changes made here, after a pause so a run written in steps is sent once.
  useEffect(() => {
    if (!syncedUid || !baseline.current) return;
    const timer = setTimeout(flush, options.debounceMs ?? 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, syncedUid]);

  // Leaving the page sends what is still waiting.
  useEffect(() => {
    if (!syncedUid) return;
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedUid]);

  return syncedUid !== null && syncedUid === uid;
}
