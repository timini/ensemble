import type {
  DocumentSnapshot,
  Firestore,
  Query,
} from "firebase-admin/firestore";
import type { CallUsage } from "@ensemble-ai/shared-utils/pricing";
import {
  summarizeRun,
  usageByModel,
  type ModelUsage,
  type RunSummary,
  type UsageRecord,
} from "./accountUsage";
import { assertSafeId, COLLECTIONS, type LedgerEntryType } from "./ledger";

/** Ledger entries that move money in or out, as /account lists them. */
export const PURCHASE_TYPES = ["purchase", "reversal", "grant"] as const;
export type PurchaseType = (typeof PURCHASE_TYPES)[number] & LedgerEntryType;

export interface PurchaseItem {
  id: string;
  type: PurchaseType;
  /** Signed: a reversal is negative. */
  amountMicros: number;
  createdAtMs: number;
  packId?: string;
  /** reversal: `refund` or `dispute`. */
  reason?: string;
}

export interface Page<T> {
  items: T[];
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
}

export interface PageInput {
  cursor?: string | null;
  limit: number;
}

function millis(snap: DocumentSnapshot): number {
  const value: unknown = snap.get("createdAt");
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function")
    return (value as { toMillis: () => number }).toMillis();
  return 0;
}

/** Read one page of a query ordered newest first, after the cursor document. */
async function page(
  query: Query,
  after: DocumentSnapshot | null,
  limit: number,
): Promise<{ docs: DocumentSnapshot[]; more: boolean }> {
  const ordered = query.orderBy("createdAt", "desc");
  const snap = await (after ? ordered.startAfter(after) : ordered)
    .limit(limit + 1)
    .get();
  return { docs: snap.docs.slice(0, limit), more: snap.size > limit };
}

/** Purchases, reversals and grants of a user, newest first. */
export async function listPurchases(
  db: Firestore,
  uid: string,
  { cursor, limit }: PageInput,
): Promise<Page<PurchaseItem>> {
  assertSafeId("uid", uid);
  const ledger = db.collection(COLLECTIONS.ledger);
  const after = cursor ? await ledger.doc(cursor).get() : null;
  // A cursor must be one of this user's entries.
  if (after && (!after.exists || after.get("uid") !== uid))
    return { items: [], nextCursor: null };
  const { docs, more } = await page(
    ledger.where("uid", "==", uid).where("type", "in", [...PURCHASE_TYPES]),
    after,
    limit,
  );
  const items = docs.map((d) => ({
    id: d.id,
    type: d.get("type") as PurchaseType,
    amountMicros: Number(d.get("amountMicros")),
    createdAtMs: millis(d),
    ...(d.get("packId") ? { packId: String(d.get("packId")) } : {}),
    ...(d.get("reason") ? { reason: String(d.get("reason")) } : {}),
  }));
  return { items, nextCursor: more ? (docs.at(-1)?.id ?? null) : null };
}

function usageRecord(d: DocumentSnapshot): UsageRecord {
  return {
    runId: String(d.get("runId")),
    createdAtMs: millis(d),
    chargedMicros: Number(d.get("chargedMicros") ?? 0),
    calls: (d.get("calls") as CallUsage[] | undefined) ?? [],
  };
}

/** Settled Pro runs of a user, newest first. The cursor is a run id. */
export async function listRuns(
  db: Firestore,
  uid: string,
  { cursor, limit }: PageInput,
): Promise<Page<RunSummary>> {
  assertSafeId("uid", uid);
  if (cursor) assertSafeId("run id", cursor);
  const usage = db.collection(COLLECTIONS.usage);
  const after = cursor ? await usage.doc(`${uid}__${cursor}`).get() : null;
  if (after && !after.exists) return { items: [], nextCursor: null };
  const { docs, more } = await page(
    usage.where("uid", "==", uid),
    after,
    limit,
  );
  const items = docs.map((d) => summarizeRun(usageRecord(d)));
  return { items, nextCursor: more ? (items.at(-1)?.runId ?? null) : null };
}

export interface ModelUsageReport {
  sinceMs: number;
  runCount: number;
  /** True when more runs than `maxRuns` fell in the window; the rows cover the newest. */
  truncated: boolean;
  models: ModelUsage[];
}

/** Usage per model over the runs settled since `sinceMs`, at most `maxRuns` of them. */
export async function modelUsageSince(
  db: Firestore,
  uid: string,
  { sinceMs, maxRuns }: { sinceMs: number; maxRuns: number },
): Promise<ModelUsageReport> {
  assertSafeId("uid", uid);
  const snap = await db
    .collection(COLLECTIONS.usage)
    .where("uid", "==", uid)
    .where("createdAt", ">=", new Date(sinceMs))
    .orderBy("createdAt", "desc")
    .limit(maxRuns + 1)
    .get();
  const records = snap.docs.slice(0, maxRuns).map(usageRecord);
  return {
    sinceMs,
    runCount: records.length,
    truncated: snap.size > maxRuns,
    models: usageByModel(records),
  };
}
