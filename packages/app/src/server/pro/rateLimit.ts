import type { Firestore } from "firebase-admin/firestore";
import { assertSafeId } from "~/server/credits/ledger";

/** `rateLimits/{uid}`: the user's current fixed window. Server only. */
export const RATE_LIMITS = "rateLimits";

/** Too many actions (Pro runs, shares, sync writes) in the current window. */
export class RateLimitError extends Error {
  constructor(
    readonly retryAfterSeconds: number,
    what = "Pro runs",
  ) {
    super(`Too many ${what}. Try again in ${retryAfterSeconds} s.`);
    this.name = "RateLimitError";
  }
}

/** A fixed-window limit: at most `limit` actions per `windowSeconds`. */
export interface RateWindow {
  limit: number;
  windowSeconds: number;
  now?: number;
}

/**
 * Count one Pro run against the user's limit: at most `limit` runs per
 * fixed window of `windowSeconds`. Kept in Firestore, so the limit holds
 * across App Hosting instances. Throws RateLimitError when it is reached.
 */
export async function takeRunSlot(
  db: Firestore,
  uid: string,
  options: RateWindow,
): Promise<void> {
  assertSafeId("uid", uid);
  await takeRateSlot(db, uid, options, "Pro runs");
}

/**
 * Count one action against the limit kept in `rateLimits/{key}`. The key
 * names the user and the action (`share__<uid>`). Throws RateLimitError,
 * naming `what`, when the limit is reached.
 */
export async function takeRateSlot(
  db: Firestore,
  key: string,
  options: RateWindow,
  what: string,
): Promise<void> {
  const now = options.now ?? Date.now();
  const windowMs = options.windowSeconds * 1000;
  const ref = db.collection(RATE_LIMITS).doc(key);
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as
      | { windowStartMs: number; count: number }
      | undefined;
    const fresh = !data || now - data.windowStartMs >= windowMs;
    if (fresh) {
      tx.set(ref, { windowStartMs: now, count: 1 });
      return;
    }
    if (data.count >= options.limit) {
      throw new RateLimitError(
        Math.max(1, Math.ceil((data.windowStartMs + windowMs - now) / 1000)),
        what,
      );
    }
    tx.update(ref, { count: data.count + 1 });
  });
}
