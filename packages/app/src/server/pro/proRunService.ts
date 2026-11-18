import type { Firestore } from "firebase-admin/firestore";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import type { CreditConfig } from "~/server/credits/config";
import { refundRun, settleRun } from "~/server/credits/creditService";
import { reserveForRun, type RunQuoteInput } from "~/server/credits/runBilling";
import type { ProConfig } from "./config";
import { takeRunSlot } from "./rateLimit";
import {
  markProRunClosed,
  markProRunClosing,
  openProRun,
  readProRun,
  staleProRuns,
  type ProRunOutcome,
} from "./runStore";
import type { Upstream, UpstreamOptions } from "./upstream";

/** What the Pro run path needs, injected so tests can swap each part. */
export interface ProDeps {
  db: Firestore;
  config: ProConfig;
  credit: Pick<CreditConfig, "marginPercent" | "lowBalanceMicros"> & {
    priceTable?: PriceTable;
  };
  upstream: (options?: UpstreamOptions) => Upstream;
  now?: () => number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Start a Pro run: count it against the rate limit, settle the user's
 * abandoned runs, reserve the high estimate plus the margin
 * (reserveForRun) and open the run record. Throws RateLimitError,
 * InsufficientCreditsError, or a RangeError for an unpriced model.
 * Starting the same run id again returns the first reservation.
 */
export async function startProRun(
  deps: ProDeps,
  uid: string,
  input: { runId: string; run: RunQuoteInput },
): Promise<{ runId: string; reservedMicros: number; balanceMicros: number }> {
  const now = deps.now?.() ?? Date.now();
  const existing = await readProRun(deps.db, uid, input.runId);
  if (existing) {
    return { runId: input.runId, reservedMicros: existing.reservedMicros, balanceMicros: -1 };
  }
  await takeRunSlot(deps.db, uid, {
    limit: deps.config.rateLimitRuns,
    windowSeconds: deps.config.rateLimitWindowSeconds,
    now,
  });
  const stale = await staleProRuns(deps.db, uid, now - deps.config.staleRunMinutes * 60_000);
  for (const runId of stale) {
    await closeProRun(deps, uid, runId, { reason: "abandoned", waitMs: 0 });
  }
  const reservation = await reserveForRun(deps.db, deps.credit, {
    uid,
    runId: input.runId,
    run: input.run,
  });
  await openProRun(deps.db, {
    uid,
    runId: input.runId,
    reservedMicros: reservation.reservedMicros,
    tokenBudget: deps.config.maxRunTokens,
    maxCalls: deps.config.maxCallsPerRun,
    now,
  });
  return {
    runId: input.runId,
    reservedMicros: reservation.reservedMicros,
    balanceMicros: reservation.balanceMicros,
  };
}

export interface CloseResult {
  outcome: ProRunOutcome | null;
  balanceMicros: number | null;
}

/**
 * End a run: stop admitting calls, wait up to `waitMs` for calls still in
 * flight to record their usage, then settle for the usage recorded (actual
 * cost plus the margin, never more than the reservation) or, when no call
 * produced anything, refund the whole reservation. A cancelled run settles
 * for what it used. Idempotent: closing a closed run returns its outcome.
 */
export async function closeProRun(
  deps: ProDeps,
  uid: string,
  runId: string,
  options: { reason: string; waitMs?: number },
): Promise<CloseResult> {
  const opened = await markProRunClosing(deps.db, uid, runId);
  if (!opened) {
    const run = await readProRun(deps.db, uid, runId);
    return { outcome: run?.outcome ?? null, balanceMicros: null };
  }
  const deadline = Date.now() + (options.waitMs ?? 8000);
  let run = opened;
  while (run.inFlight > 0 && Date.now() < deadline) {
    await sleep(200);
    run = (await readProRun(deps.db, uid, runId)) ?? run;
  }
  run = (await readProRun(deps.db, uid, runId)) ?? run;

  let outcome: ProRunOutcome;
  let balanceMicros: number;
  if (run.calls.length > 0) {
    const calls = run.calls.map(({ callId: _callId, ...call }) => call);
    const settled = await settleRun(deps.db, deps.credit, { uid, runId, calls });
    outcome = {
      type: "settled",
      chargedMicros: settled.chargedMicros,
      releasedMicros: settled.releasedMicros,
    };
    balanceMicros = settled.balanceMicros;
  } else {
    const refunded = await refundRun(deps.db, { uid, runId, reason: options.reason });
    outcome = { type: "refunded", refundedMicros: refunded.refundedMicros };
    balanceMicros = refunded.balanceMicros;
  }
  await markProRunClosed(deps.db, uid, runId, outcome);
  return { outcome, balanceMicros };
}
