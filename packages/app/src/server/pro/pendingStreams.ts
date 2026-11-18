import {
  FieldValue,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import { assertSafeId } from "~/server/credits/ledger";
import { ProRunError, proRunRef } from "./runStore";

/**
 * Streams admitted by `provider.prepareStream` and waiting for their SSE
 * subscription, kept under the run record they were admitted to.
 */
/**
 * A stream admitted by `provider.prepareStream` and waiting for its SSE
 * subscription: `proRuns/{uid}__{runId}/streams/{callId}`. The prompt
 * travels in the POST body and is kept here for the moment between the two
 * requests, because an SSE subscription is a GET and its input would go in
 * the URL. Deleted once the stream starts.
 */
export interface PendingStream {
  provider: string;
  model: string;
  prompt: string;
  temperature?: number;
  seed?: number;
  maxOutputTokens: number;
  countedInputTokens: number;
  claimed: boolean;
}

function streamRef(db: Firestore, uid: string, runId: string, callId: string) {
  assertSafeId("run id", callId);
  return proRunRef(db, uid, runId)
    .collection("streams")
    .doc(callId) as DocumentReference<PendingStream>;
}

/**
 * Keep an admitted stream until its subscription starts. Refused once the
 * run has ended, was abandoned or was stopped, so a stream admitted just
 * before Stop cannot be left waiting for a subscription that never comes.
 */
export async function storePendingStream(
  db: Firestore,
  ref: { uid: string; runId: string; callId: string },
  stream: Omit<PendingStream, "claimed">,
): Promise<void> {
  const doc = streamRef(db, ref.uid, ref.runId, ref.callId);
  const run = proRunRef(db, ref.uid, ref.runId);
  await db.runTransaction(async (tx) => {
    const parent = (await tx.get(run)).data();
    if (!parent)
      throw new ProRunError("This Pro run does not exist.", "not_found");
    if (parent.status === "closed" || parent.abandoned || parent.cancelled) {
      throw new ProRunError("This Pro run has ended.", "closed");
    }
    tx.create(doc, { ...stream, claimed: false });
  });
}

/**
 * Take a prepared stream once. A second subscription to it is refused, and
 * so is one whose run is closed, was abandoned or was stopped: the run is
 * settled, or the user no longer wants the answer. A run closing normally
 * still takes the streams it admitted, since it waits for them.
 */
export async function claimPendingStream(
  db: Firestore,
  ref: { uid: string; runId: string; callId: string },
): Promise<PendingStream> {
  const doc = streamRef(db, ref.uid, ref.runId, ref.callId);
  const run = proRunRef(db, ref.uid, ref.runId);
  const stream = await db.runTransaction(async (tx) => {
    const [runSnap, streamSnap] = await Promise.all([tx.get(run), tx.get(doc)]);
    const parent = runSnap.data();
    if (!parent)
      throw new ProRunError("This Pro run does not exist.", "not_found");
    if (parent.status === "closed" || parent.abandoned || parent.cancelled) {
      throw new ProRunError("This Pro run has ended.", "closed");
    }
    const data = streamSnap.data();
    if (!data)
      throw new ProRunError("This stream was not prepared.", "not_found");
    if (data.claimed) {
      throw new ProRunError(
        "This stream was already started.",
        "duplicate_call",
      );
    }
    tx.update(doc, { claimed: true });
    return data;
  });
  await doc.delete();
  return stream;
}

/**
 * Mark a run abandoned before it is force-closed, and drop its prepared
 * streams, so none of them can start once the run is settled.
 */
export async function markProRunAbandoned(
  db: Firestore,
  uid: string,
  runId: string,
): Promise<void> {
  const ref = proRunRef(db, uid, runId);
  await db.runTransaction(async (tx) => {
    const run = (await tx.get(ref)).data();
    if (!run || run.status === "closed") return;
    tx.update(ref, { status: "closing", abandoned: true });
  });
  const pending = await ref.collection("streams").get();
  await Promise.all(pending.docs.map((d) => d.ref.delete()));
}

/**
 * Drop the streams a stopped run admitted but never started, and give
 * their place in the run back (nothing reached the model, so nothing is
 * billed). Each stream is taken in a transaction, so one whose
 * subscription claimed it first is left to finish and record its usage.
 * Returns how many were dropped.
 */
export async function releaseUnstartedStreams(
  db: Firestore,
  uid: string,
  runId: string,
): Promise<number> {
  const run = proRunRef(db, uid, runId);
  const pending = await run.collection("streams").get();
  const dropped = await Promise.all(
    pending.docs.map((d) =>
      db.runTransaction(async (tx) => {
        const stream = (await tx.get(d.ref)).data() as
          | PendingStream
          | undefined;
        if (!stream || stream.claimed) return 0;
        tx.delete(d.ref);
        tx.update(run, {
          inFlight: FieldValue.increment(-1),
          tokensUsed: FieldValue.increment(-stream.countedInputTokens),
        });
        return 1;
      }),
    ),
  );
  return dropped.reduce<number>((a, b) => a + b, 0);
}
