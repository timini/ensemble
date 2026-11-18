import type { Firestore } from "firebase-admin/firestore";
import {
  findSecretField,
  SYNC_ID,
  SYNC_LIMITS,
  SYNC_LIST_LIMIT,
  type SyncItem,
  type SyncKind,
  type SyncSnapshot,
} from "~/lib/sync/syncItems";
import { assertSafeId } from "~/server/credits/ledger";

/**
 * Synced history and presets: `history/{uid}__{id}` and
 * `presets/{uid}__{id}`. The server writes them for the signed-in user;
 * clients never touch the collections directly. A deleted item stays as a
 * tombstone (`deleted: true`, no payload) so other devices drop it too.
 */
export const SYNC_COLLECTIONS: Record<SyncKind, string> = {
  history: "history",
  presets: "presets",
};

interface SyncDoc {
  uid: string;
  id: string;
  updatedAt: number;
  deleted: boolean;
  payload: string | null;
}

/** An item the server will not store. */
export class SyncItemError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "SyncItemError";
  }
}

function ref(db: Firestore, kind: SyncKind, uid: string, id: string) {
  return db.collection(SYNC_COLLECTIONS[kind]).doc(`${uid}__${id}`);
}

/** Checks one item: id, size, JSON object with the same id, no secret field. */
export function assertSyncItem(kind: SyncKind, item: SyncItem): void {
  if (!SYNC_ID.test(item.id)) throw new SyncItemError("Invalid item id");
  if (!Number.isSafeInteger(item.updatedAt) || item.updatedAt < 0)
    throw new SyncItemError("Invalid updatedAt");
  if (item.payload.length > SYNC_LIMITS[kind].maxPayload)
    throw new SyncItemError("Item too large to sync");
  let parsed: unknown;
  try {
    parsed = JSON.parse(item.payload);
  } catch {
    throw new SyncItemError("Item is not JSON");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    (parsed as { id?: unknown }).id !== item.id
  )
    throw new SyncItemError("Item does not match its id");
  const secret = findSecretField(parsed);
  if (secret) throw new SyncItemError(`Item has a secret field (${secret})`);
}

/** The user's items and tombstones, newest change first. */
export async function listSyncItems(
  db: Firestore,
  uid: string,
  kind: SyncKind,
): Promise<SyncSnapshot> {
  assertSafeId("uid", uid);
  const snap = await db
    .collection(SYNC_COLLECTIONS[kind])
    .where("uid", "==", uid)
    .orderBy("updatedAt", "desc")
    .limit(SYNC_LIST_LIMIT)
    .get();
  const out: SyncSnapshot = { items: [], deleted: [] };
  for (const d of snap.docs) {
    const doc = d.data() as SyncDoc;
    if (doc.deleted || doc.payload === null)
      out.deleted.push({ id: doc.id, deletedAt: doc.updatedAt });
    else
      out.items.push({
        id: doc.id,
        updatedAt: doc.updatedAt,
        payload: doc.payload,
      });
  }
  return out;
}

/**
 * Store items, newest write wins: an item older than what is stored (or
 * than its tombstone) is skipped. Returns the ids written.
 */
export async function upsertSyncItems(
  db: Firestore,
  uid: string,
  kind: SyncKind,
  items: SyncItem[],
): Promise<string[]> {
  assertSafeId("uid", uid);
  if (items.length > SYNC_LIMITS[kind].maxBatch)
    throw new SyncItemError("Too many items in one call");
  items.forEach((item) => assertSyncItem(kind, item));
  if (items.length === 0) return [];
  return db.runTransaction(async (tx) => {
    const refs = items.map((i) => ref(db, kind, uid, i.id));
    const current = await tx.getAll(...refs);
    const written: string[] = [];
    items.forEach((item, i) => {
      const stored = current[i]?.data() as SyncDoc | undefined;
      if (stored && stored.updatedAt >= item.updatedAt) return;
      const doc: SyncDoc = {
        uid,
        id: item.id,
        updatedAt: item.updatedAt,
        deleted: false,
        payload: item.payload,
      };
      tx.set(refs[i]!, doc);
      written.push(item.id);
    });
    return written;
  });
}

/** Delete items, leaving tombstones dated `now`. */
export async function removeSyncItems(
  db: Firestore,
  uid: string,
  kind: SyncKind,
  ids: string[],
  now = Date.now(),
): Promise<void> {
  assertSafeId("uid", uid);
  if (ids.length > SYNC_LIST_LIMIT)
    throw new SyncItemError("Too many items in one call");
  ids.forEach((id) => {
    if (!SYNC_ID.test(id)) throw new SyncItemError("Invalid item id");
  });
  const batch = db.batch();
  for (const id of ids) {
    const doc: SyncDoc = {
      uid,
      id,
      updatedAt: now,
      deleted: true,
      payload: null,
    };
    batch.set(ref(db, kind, uid, id), doc);
  }
  await batch.commit();
}
