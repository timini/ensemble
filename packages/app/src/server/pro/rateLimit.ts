import type { Firestore } from "firebase-admin/firestore";
import { assertSafeId } from "~/server/credits/ledger";

/** `rateLimits/{uid}`: the user's current fixed window. Server only. */
export const RATE_LIMITS = "rateLimits";

/** Too many Pro runs in the current window. */
export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`Too many Pro runs. Try again in ${retryAfterSeconds} s.`);
    this.name = "RateLimitError";
  }
}

/**
 * Count one Pro run against the user's limit: at most `limit` runs per
 * fixed window of `windowSeconds`. Kept in Firestore, so the limit holds
 * across App Hosting instances. Throws RateLimitError when it is reached.
 */
export async function takeRunSlot(
  db: Firestore,
  uid: string,
  options: { limit: number; windowSeconds: number; now?: number },
): Promise<void> {
  assertSafeId("uid", uid);
  const now = options.now ?? Date.now();
  const windowMs = options.windowSeconds * 1000;
  const ref = db.collection(RATE_LIMITS).doc(uid);
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
      );
    }
    tx.update(ref, { count: data.count + 1 });
  });
}
