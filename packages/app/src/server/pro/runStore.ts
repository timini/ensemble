import {
  FieldValue,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import type { CallUsage } from "@ensemble-ai/shared-utils/pricing";
import { assertSafeId } from "~/server/credits/ledger";

/**
 * Firestore record of an open Pro run, `proRuns/{uid}__{runId}`. Every
 * server call checks it before calling the model (the run is open, the
 * call id is new, the token and call budgets are not spent) and adds its
 * usage after. Kept in Firestore so calls of one run may land on different
 * App Hosting instances. Server only; firestore.rules closes it to clients.
 */
export const PRO_RUNS = "proRuns";

export type ProRunStatus = "open" | "closing" | "closed";

export interface ProRunCall extends CallUsage {
  callId: string;
}

export interface ProRunDoc {
  uid: string;
  runId: string;
  status: ProRunStatus;
  reservedMicros: number;
  tokenBudget: number;
  maxCalls: number;
  /** Tokens counted so far: reported or estimated usage, plus the input of calls in flight. */
  tokensUsed: number;
  callIds: string[];
  inFlight: number;
  calls: ProRunCall[];
  createdAtMs: number;
  outcome?: ProRunOutcome;
}

export type ProRunOutcome =
  | { type: "settled"; chargedMicros: number; releasedMicros: number }
  | { type: "refunded"; refundedMicros: number };

/** A call the run cannot take: closed run, repeated call id, or a spent budget. */
export class ProRunError extends Error {
  constructor(
    message: string,
    readonly reason: "not_found" | "closed" | "duplicate_call" | "budget",
  ) {
    super(message);
    this.name = "ProRunError";
  }
}

export function proRunRef(db: Firestore, uid: string, runId: string) {
  assertSafeId("uid", uid);
  assertSafeId("run id", runId);
  return db
    .collection(PRO_RUNS)
    .doc(`${uid}__${runId}`) as DocumentReference<ProRunDoc>;
}

/** Record a run once its credits are reserved. */
export async function openProRun(
  db: Firestore,
  input: {
    uid: string;
    runId: string;
    reservedMicros: number;
    tokenBudget: number;
    maxCalls: number;
    now?: number;
  },
): Promise<void> {
  await proRunRef(db, input.uid, input.runId).create({
    uid: input.uid,
    runId: input.runId,
    status: "open",
    reservedMicros: input.reservedMicros,
    tokenBudget: input.tokenBudget,
    maxCalls: input.maxCalls,
    tokensUsed: 0,
    callIds: [],
    inFlight: 0,
    calls: [],
    createdAtMs: input.now ?? Date.now(),
  });
}

/**
 * Admit one call to a run. Counts its input tokens against the budget now
 * and returns the output tokens it may still use (at most
 * `maxCallOutputTokens`). Throws ProRunError when it cannot run.
 */
export async function beginProCall(
  db: Firestore,
  input: {
    uid: string;
    runId: string;
    callId: string;
    inputTokens: number;
    maxCallOutputTokens: number;
  },
): Promise<{ maxOutputTokens: number }> {
  const ref = proRunRef(db, input.uid, input.runId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const run = snap.data();
    if (!run) throw new ProRunError("This Pro run does not exist.", "not_found");
    if (run.status !== "open") throw new ProRunError("This Pro run has ended.", "closed");
    if (run.callIds.includes(input.callId)) {
      throw new ProRunError("This call was already made.", "duplicate_call");
    }
    if (run.callIds.length >= run.maxCalls) {
      throw new ProRunError("This run has made as many calls as one run may.", "budget");
    }
    const remaining = run.tokenBudget - run.tokensUsed - input.inputTokens;
    if (remaining <= 0) {
      throw new ProRunError("This run has used its token budget.", "budget");
    }
    tx.update(ref, {
      callIds: FieldValue.arrayUnion(input.callId),
      inFlight: FieldValue.increment(1),
      tokensUsed: FieldValue.increment(input.inputTokens),
    });
    return { maxOutputTokens: Math.min(input.maxCallOutputTokens, remaining) };
  });
}

/**
 * Close a call: add its usage (none for a call that failed before any
 * output) and give back the input tokens counted by beginProCall.
 */
export async function endProCall(
  db: Firestore,
  input: {
    uid: string;
    runId: string;
    callId: string;
    countedInputTokens: number;
    usage: CallUsage | null;
  },
): Promise<void> {
  const ref = proRunRef(db, input.uid, input.runId);
  const used = input.usage ? input.usage.inputTokens + input.usage.outputTokens : 0;
  await ref.update({
    inFlight: FieldValue.increment(-1),
    tokensUsed: FieldValue.increment(used - input.countedInputTokens),
    ...(input.usage
      ? { calls: FieldValue.arrayUnion({ ...input.usage, callId: input.callId }) }
      : {}),
  });
}

/** Stop admitting calls. Returns the run, or null when it was already closing or closed. */
export async function markProRunClosing(
  db: Firestore,
  uid: string,
  runId: string,
): Promise<ProRunDoc | null> {
  const ref = proRunRef(db, uid, runId);
  return db.runTransaction(async (tx) => {
    const run = (await tx.get(ref)).data();
    if (!run) throw new ProRunError("This Pro run does not exist.", "not_found");
    if (run.status !== "open") return null;
    tx.update(ref, { status: "closing" });
    return run;
  });
}

export async function readProRun(
  db: Firestore,
  uid: string,
  runId: string,
): Promise<ProRunDoc | null> {
  return (await proRunRef(db, uid, runId).get()).data() ?? null;
}

export async function markProRunClosed(
  db: Firestore,
  uid: string,
  runId: string,
  outcome: ProRunOutcome,
): Promise<void> {
  await proRunRef(db, uid, runId).update({ status: "closed", outcome });
}

/** Run ids of a user's runs still open and started before `beforeMs`. */
export async function staleProRuns(
  db: Firestore,
  uid: string,
  beforeMs: number,
): Promise<string[]> {
  const snap = await db
    .collection(PRO_RUNS)
    .where("uid", "==", uid)
    .where("status", "==", "open")
    .get();
  return snap.docs
    .map((d) => d.data() as ProRunDoc)
    .filter((run) => run.createdAtMs < beforeMs)
    .map((run) => run.runId);
}
