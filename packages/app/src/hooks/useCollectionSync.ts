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
 * deletes win over older copies) and uploads what the account lacks. If
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
  /** Items as last merged or sent, by id. Null until the first merge. */
  const baseline = useRef<Map<string, T> | null>(null);
  const [syncedUid, setSyncedUid] = useState<string | null>(null);
  const latest = useRef(items);
  latest.current = items;
  /** This browser's list from before the merge, until `apply` replaces it. */
  const premerge = useRef<T[] | null>(null);

  const send = async (changed: T[], removed: string[]) => {
    const { api, slim } = opts.current;
    const max = SYNC_LIMITS[kind].maxBatch;
    const payloads: SyncItem[] = [];
    for (const item of changed) {
      const payload = toSyncPayload(kind, item, slim);
      if (payload)
        payloads.push({
          id: item.id,
          updatedAt: opts.current.stamp(item),
          payload,
        });
    }
    for (let i = 0; i < payloads.length; i += max)
      await api.upsert(kind, payloads.slice(i, i + max));
    if (removed.length) await api.remove(kind, removed);
  };

  // Merge on sign-in, once this browser's items have loaded.
  useEffect(() => {
    baseline.current = null;
    setSyncedUid(null);
    if (!uid || !ready) return;
    let live = true;
    void (async () => {
      const { api, stamp, apply } = opts.current;
      premerge.current = latest.current;
      const owner = readOwner(kind);
      const local = owner && owner !== uid ? [] : latest.current;
      const remote = await api.list(kind);
      if (!live) return;
      const { merged, upload } = mergeSync(
        local,
        remote,
        stamp,
        parseSyncPayload<T>,
      );
      baseline.current = new Map(merged.map((i) => [i.id, i]));
      await apply(merged);
      await send(upload, []);
      try {
        localStorage.setItem(syncOwnerKey(kind), uid);
      } catch {
        // Storage blocked: the next sign-in merges again, which is safe.
      }
      if (live) setSyncedUid(uid);
    })().catch(warn(kind, "merging"));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ready, kind]);

  /** Sends what changed since the baseline, if anything. */
  const flush = () => {
    const base = baseline.current;
    const current = latest.current;
    // Not replaced by the merged list yet: nothing has changed here.
    if (!base || current === premerge.current) return;
    const changed = current.filter((i) => base.get(i.id) !== i);
    const ids = new Set(current.map((i) => i.id));
    const removed = [...base.keys()].filter((id) => !ids.has(id));
    if (!changed.length && !removed.length) return;
    baseline.current = new Map(current.map((i) => [i.id, i]));
    void send(changed, removed).catch(warn(kind, "sending"));
  };

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
