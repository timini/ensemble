import type { Firestore } from "firebase-admin/firestore";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import type { CreditConfig } from "~/server/credits/config";
import { refundRun, settleRun } from "~/server/credits/creditService";
import { reserveForRun, type RunQuoteInput } from "~/server/credits/runBilling";
import { logger } from "~/lib/logger";
import type { ProConfig } from "./config";
import { billableRunModels } from "./models";
import { markProRunAbandoned, releaseUnstartedStreams } from "./pendingStreams";
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

function pick(r: { reservedMicros: number; balanceMicros: number }) {
  return { reservedMicros: r.reservedMicros, balanceMicros: r.balanceMicros };
}

/** Settle the user's runs left open or closing past the stale age. Never throws. */
async function settleStaleRuns(deps: ProDeps, uid: string, now: number) {
  const before = now - deps.config.staleRunMinutes * 60_000;
  let stale: string[] = [];
  try {
    stale = await staleProRuns(deps.db, uid, before);
  } catch (error) {
    logger.warn("[pro] Could not list stale runs", error);
  }
  for (const runId of stale) {
    try {
      await closeProRun(deps, uid, runId, {
        reason: "abandoned",
        waitMs: 0,
        force: true,
      });
    } catch (error) {
      logger.warn(`[pro] Could not settle stale run ${runId}`, error);
    }
  }
}

/**
 * Start a Pro run: count it against the rate limit, settle the user's
 * abandoned runs, reserve the high estimate plus the margin
 * (reserveForRun) and open the run record with the models it was priced
 * for. Throws RateLimitError, InsufficientCreditsError, a RangeError for
 * an unpriced model, or UnpricedModelError for a model priced at zero.
 * Starting the same run id again returns the first reservation.
 */
export async function startProRun(
  deps: ProDeps,
  uid: string,
  input: { runId: string; run: RunQuoteInput },
): Promise<{ runId: string; reservedMicros: number; balanceMicros: number }> {
  const now = deps.now?.() ?? Date.now();
  const models = billableRunModels(input.run, deps.credit.priceTable);
  if (await readProRun(deps.db, uid, input.runId)) {
    // A repeated start: reserveForRun is idempotent and returns the first reservation.
    const again = await reserveForRun(deps.db, deps.credit, { uid, ...input });
    return { runId: input.runId, ...pick(again) };
  }
  await takeRunSlot(deps.db, uid, {
    limit: deps.config.rateLimitRuns,
    windowSeconds: deps.config.rateLimitWindowSeconds,
    now,
  });
  await settleStaleRuns(deps, uid, now);
  const reservation = await reserveForRun(deps.db, deps.credit, {
    uid,
    ...input,
  });
  if (reservation.duplicate)
    return { runId: input.runId, ...pick(reservation) };
  try {
    await openProRun(deps.db, {
      uid,
      runId: input.runId,
      reservedMicros: reservation.reservedMicros,
      models,
      tokenBudget: deps.config.maxRunTokens,
      maxCalls: deps.config.maxCallsPerRun,
      now,
    });
  } catch (error) {
    // A concurrent start of the same run created it first: that is fine.
    if (await readProRun(deps.db, uid, input.runId)) {
      return { runId: input.runId, ...pick(reservation) };
    }
    // Otherwise no call can use this reservation: give it back.
    await refundRun(deps.db, {
      uid,
      runId: input.runId,
      reason: "run record failed",
    });
    throw error;
  }
  return { runId: input.runId, ...pick(reservation) };
}

export interface CloseResult {
  /** Null while calls are still in flight: the last of them settles the run. */
  outcome: ProRunOutcome | null;
  balanceMicros: number | null;
}

/**
 * Settle a closing run once no call is in flight (or at once with `force`,
 * for abandoned runs): the usage recorded plus the margin, never more than
 * the reservation, or a full refund when nothing was used. Idempotent; the
 * ledger refuses a second settle or refund of the same run.
 */
export async function finalizeProRun(
  deps: ProDeps,
  uid: string,
  runId: string,
  options: { reason: string; force?: boolean },
): Promise<CloseResult> {
  const run = await readProRun(deps.db, uid, runId);
  if (!run) return { outcome: null, balanceMicros: null };
  if (run.status === "closed")
    return { outcome: run.outcome ?? null, balanceMicros: null };
  if (run.inFlight > 0 && !options.force)
    return { outcome: null, balanceMicros: null };
  if (options.force) await markProRunAbandoned(deps.db, uid, runId);

  let outcome: ProRunOutcome;
  let balanceMicros: number;
  if (run.calls.length > 0) {
    const calls = run.calls.map(({ callId: _callId, ...call }) => call);
    const settled = await settleRun(deps.db, deps.credit, {
      uid,
      runId,
      calls,
    });
    outcome = {
      type: "settled",
      chargedMicros: settled.chargedMicros,
      releasedMicros: settled.releasedMicros,
    };
    balanceMicros = settled.balanceMicros;
  } else {
    const refunded = await refundRun(deps.db, {
      uid,
      runId,
      reason: options.reason,
    });
    outcome = { type: "refunded", refundedMicros: refunded.refundedMicros };
    balanceMicros = refunded.balanceMicros;
  }
  await markProRunClosed(deps.db, uid, runId, outcome);
  return { outcome, balanceMicros };
}

/**
 * End a run: stop admitting calls and wait up to `waitMs` for calls in
 * flight to record their usage, then settle (finalizeProRun). If calls are
 * still running after the wait, the run stays `closing` and the last call
 * to end settles it, so a run is never refunded while it is still using
 * the model. A cancelled run drops the streams it admitted but never
 * started, then settles for what it used. Idempotent.
 */
export async function closeProRun(
  deps: ProDeps,
  uid: string,
  runId: string,
  options: { reason: string; waitMs?: number; force?: boolean },
): Promise<CloseResult> {
  const cancelled = options.reason === "cancelled";
  const opened = await markProRunClosing(deps.db, uid, runId, { cancelled });
  if (!opened && !options.force) {
    const run = await readProRun(deps.db, uid, runId);
    return { outcome: run?.outcome ?? null, balanceMicros: null };
  }
  let inFlight = opened?.inFlight ?? 0;
  // After Stop the browser opens no more subscriptions, so streams it had
  // admitted but not started would keep the run open until it went stale.
  if (cancelled && inFlight > 0) {
    await releaseUnstartedStreams(deps.db, uid, runId);
    inFlight = (await readProRun(deps.db, uid, runId))?.inFlight ?? 0;
  }
  const deadline = Date.now() + (options.waitMs ?? 8000);
  while (inFlight > 0 && Date.now() < deadline) {
    await sleep(200);
    inFlight = (await readProRun(deps.db, uid, runId))?.inFlight ?? 0;
  }
  return finalizeProRun(deps, uid, runId, options);
}
