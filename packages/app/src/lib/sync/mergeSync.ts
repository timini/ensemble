import {
  stripSecrets,
  SYNC_LIMITS,
  type SyncKind,
  type SyncSnapshot,
} from "./syncItems";

/** What merging this browser's items with the account's gives. */
export interface MergeResult<T> {
  /** Items to keep in this browser. */
  merged: T[];
  /** Items this browser has and the account lacks, or holds an older copy of. */
  upload: T[];
}

/**
 * Merge this browser's items with the account's copy. The newer copy of an
 * item wins (by `stamp`, the last change); a tombstone at least as new as a
 * local item removes it; items only the account has are added. Items whose
 * payload does not parse are left out.
 */
export function mergeSync<T extends { id: string }>(
  local: T[],
  remote: SyncSnapshot,
  stamp: (item: T) => number,
  parse: (payload: string) => T | null,
): MergeResult<T> {
  const deletedAt = new Map(remote.deleted.map((d) => [d.id, d.deletedAt]));
  const remoteById = new Map(remote.items.map((i) => [i.id, i]));
  const merged: T[] = [];
  const upload: T[] = [];
  const seen = new Set<string>();

  for (const item of local) {
    seen.add(item.id);
    const tomb = deletedAt.get(item.id);
    if (tomb !== undefined && tomb >= stamp(item)) continue;
    const theirs = remoteById.get(item.id);
    if (theirs && theirs.updatedAt > stamp(item)) {
      const parsed = parse(theirs.payload);
      merged.push(parsed ?? item);
      continue;
    }
    merged.push(item);
    if (!theirs || theirs.updatedAt < stamp(item)) upload.push(item);
  }
  for (const theirs of remote.items) {
    if (seen.has(theirs.id)) continue;
    const parsed = parse(theirs.payload);
    if (parsed && parsed.id === theirs.id) merged.push(parsed);
  }
  return { merged, upload };
}

/**
 * An item as the JSON the server stores, without secret-looking fields.
 * `slim` gives a smaller copy to try when the item is over the size limit
 * (a run without its embeddings). Null when it still does not fit.
 */
export function toSyncPayload<T>(
  kind: SyncKind,
  item: T,
  slim?: (item: T) => T,
): string | null {
  const max = SYNC_LIMITS[kind].maxPayload;
  const full = JSON.stringify(stripSecrets(item));
  if (full.length <= max) return full;
  if (!slim) return null;
  const small = JSON.stringify(stripSecrets(slim(item)));
  return small.length <= max ? small : null;
}

/** Parses a stored payload as an object with an id, or null. */
export function parseSyncPayload<T extends { id: string }>(
  payload: string,
): T | null {
  try {
    const value = JSON.parse(payload) as unknown;
    return value && typeof value === "object" && "id" in value
      ? (value as T)
      : null;
  } catch {
    return null;
  }
}
