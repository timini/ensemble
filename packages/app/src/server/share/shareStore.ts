import { randomBytes } from "node:crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  MAX_SHARED_RUN_JSON,
  sharedRunSchema,
  type SharedRun,
} from "~/lib/share/sharedRun";
import { takeRateSlot, type RateWindow } from "~/server/pro/rateLimit";

/**
 * `shares/{id}`: a run shared by its owner, readable by anyone with the id
 * through the server (the /s/[id] page). Clients never read or write the
 * collection directly. `expiresAt` is the field of the Firestore TTL
 * policy, which deletes a share within about a day of its expiry; until
 * then the server treats an expired share as gone.
 */
export const SHARES = "shares";

/** How long a share link works. */
export const SHARE_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 16 random bytes as base64url: 22 characters, 128 bits, not guessable. */
const SHARE_ID = /^[A-Za-z0-9_-]{22}$/;

/** Shares one user may create per window, unless SHARE_RATE_LIMIT says otherwise. */
export const DEFAULT_SHARE_RATE: RateWindow = {
  limit: 20,
  windowSeconds: 60 * 60,
};

/** A share that does not exist, has expired or is not the caller's. */
export class ShareNotFoundError extends Error {
  constructor() {
    super("Share not found");
    this.name = "ShareNotFoundError";
  }
}

/** A run too large to share. */
export class ShareTooLargeError extends RangeError {
  constructor() {
    super("This run is too large to share.");
    this.name = "ShareTooLargeError";
  }
}

interface ShareDoc {
  uid: string;
  runId: string;
  payload: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/** A share as its page shows it. */
export interface PublicShare {
  id: string;
  run: SharedRun;
  createdAt: number;
  expiresAt: number;
}

/** Where a share link points, for its owner. */
export interface ShareLink {
  id: string;
  expiresAt: number;
}

/** True for a string shaped like a share id; anything else is not looked up. */
export function isShareId(id: string): boolean {
  return SHARE_ID.test(id);
}

export function newShareId(): string {
  return randomBytes(16).toString("base64url");
}

function serialize(run: SharedRun): string {
  const parsed = sharedRunSchema.parse(run);
  const payload = JSON.stringify(parsed);
  if (payload.length > MAX_SHARED_RUN_JSON) throw new ShareTooLargeError();
  return payload;
}

async function findOwn(
  db: Firestore,
  uid: string,
  runId: string,
  now: number,
): Promise<{ id: string; doc: ShareDoc } | null> {
  const snap = await db
    .collection(SHARES)
    .where("uid", "==", uid)
    .where("runId", "==", runId)
    .limit(5)
    .get();
  const live = snap.docs
    .map((d) => ({ id: d.id, doc: d.data() as ShareDoc }))
    .filter((s) => s.doc.expiresAt.toMillis() > now);
  return live[0] ?? null;
}

/**
 * Share a run. Sharing the same run again replaces what the existing link
 * shows and starts its 30 days again, so one run has one link. Counts
 * against the user's share limit either way.
 */
export async function createShare(
  db: Firestore,
  input: {
    uid: string;
    runId: string;
    run: SharedRun;
    rate?: RateWindow;
    now?: number;
  },
): Promise<ShareLink> {
  const now = input.now ?? Date.now();
  const payload = serialize(input.run);
  await takeRateSlot(
    db,
    `share__${input.uid}`,
    { ...(input.rate ?? DEFAULT_SHARE_RATE), now },
    "shared links",
  );
  const existing = await findOwn(db, input.uid, input.runId, now);
  const id = existing?.id ?? newShareId();
  const expiresAt = now + SHARE_TTL_DAYS * DAY_MS;
  const doc: ShareDoc = {
    uid: input.uid,
    runId: input.runId,
    payload,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(expiresAt),
  };
  await db.collection(SHARES).doc(id).set(doc);
  return { id, expiresAt };
}

/** The live share of one of the user's runs, if there is one. */
export async function findShareForRun(
  db: Firestore,
  uid: string,
  runId: string,
  now = Date.now(),
): Promise<ShareLink | null> {
  const found = await findOwn(db, uid, runId, now);
  return found
    ? { id: found.id, expiresAt: found.doc.expiresAt.toMillis() }
    : null;
}

/**
 * A share for its public page, or null when the id is malformed, the share
 * is gone or expired, or its stored run no longer passes the schema.
 */
export async function getShare(
  db: Firestore,
  id: string,
  now = Date.now(),
): Promise<PublicShare | null> {
  if (!isShareId(id)) return null;
  const snap = await db.collection(SHARES).doc(id).get();
  if (!snap.exists) return null;
  const doc = snap.data() as ShareDoc;
  if (doc.expiresAt.toMillis() <= now) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(doc.payload);
  } catch {
    return null;
  }
  const run = sharedRunSchema.safeParse(parsed);
  if (!run.success) return null;
  return {
    id,
    run: run.data,
    createdAt: doc.createdAt.toMillis(),
    expiresAt: doc.expiresAt.toMillis(),
  };
}

/** Delete one of the user's shares. Someone else's share counts as not found. */
export async function deleteShare(
  db: Firestore,
  uid: string,
  id: string,
): Promise<void> {
  if (!isShareId(id)) throw new ShareNotFoundError();
  const ref = db.collection(SHARES).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || (snap.data() as ShareDoc).uid !== uid)
      throw new ShareNotFoundError();
    tx.delete(ref);
  });
}
