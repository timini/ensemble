import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, type Timestamp } from "firebase-admin/firestore";
import type { SharedRun } from "~/lib/share/sharedRun";
import { RateLimitError } from "~/server/pro/rateLimit";
import {
  createShare,
  deleteShare,
  findShareForRun,
  getShare,
  isShareId,
  SHARE_TTL_DAYS,
  SHARES,
  ShareNotFoundError,
} from "../shareStore";

const app = initializeApp({ projectId: "demo-ensemble" }, "share-test");
const db = getFirestore(app);
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const RUN: SharedRun = {
  v: 1,
  prompt: "Is 17 prime?",
  runAt: NOW - 1000,
  method: "standard",
  consensus: "Yes.",
  agreement: { score: 0.9, pairs: [] },
  answers: [
    { id: "a", modelName: "A", status: "complete", content: "Yes." },
    { id: "b", modelName: "B", status: "complete", content: "Yes, it is." },
  ],
};

beforeEach(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) throw new Error("FIRESTORE_EMULATOR_HOST is not set");
  await fetch(
    `http://${host}/emulator/v1/projects/demo-ensemble/databases/(default)/documents`,
    { method: "DELETE" },
  );
});
afterAll(() => deleteApp(app));

describe("share store", () => {
  it("creates an unguessable link that works for 30 days", async () => {
    const link = await createShare(db, {
      uid: "alice",
      runId: "run-1",
      run: RUN,
      now: NOW,
    });
    expect(isShareId(link.id)).toBe(true);
    expect(link.expiresAt).toBe(NOW + SHARE_TTL_DAYS * DAY);
    const doc = (await db.collection(SHARES).doc(link.id).get()).data() as {
      expiresAt: Timestamp;
    };
    // The TTL policy field is a Timestamp.
    expect(doc.expiresAt.toMillis()).toBe(link.expiresAt);
    const shared = await getShare(db, link.id, NOW + DAY);
    expect(shared).toMatchObject({ id: link.id, run: RUN, createdAt: NOW });
  });

  it("treats an expired share as gone before the TTL policy deletes it", async () => {
    const link = await createShare(db, {
      uid: "alice",
      runId: "run-1",
      run: RUN,
      now: NOW,
    });
    expect(await getShare(db, link.id, link.expiresAt)).toBeNull();
    expect(
      await findShareForRun(db, "alice", "run-1", link.expiresAt + 1),
    ).toBeNull();
  });

  it("keeps one link per run, refreshing what it shows", async () => {
    const first = await createShare(db, {
      uid: "alice",
      runId: "run-1",
      run: RUN,
      now: NOW,
    });
    const again = await createShare(db, {
      uid: "alice",
      runId: "run-1",
      run: { ...RUN, consensus: "Yes, 17 is prime." },
      now: NOW + DAY,
    });
    expect(again.id).toBe(first.id);
    expect(again.expiresAt).toBe(NOW + DAY + SHARE_TTL_DAYS * DAY);
    expect((await getShare(db, first.id, NOW + DAY))!.run.consensus).toBe(
      "Yes, 17 is prime.",
    );
    expect(await findShareForRun(db, "alice", "run-1", NOW + DAY)).toEqual(
      again,
    );
    expect(await findShareForRun(db, "bob", "run-1", NOW + DAY)).toBeNull();
  });

  it("refuses a malformed id without reading", async () => {
    expect(await getShare(db, "../users/alice")).toBeNull();
    expect(await getShare(db, "short")).toBeNull();
  });

  it("refuses a run that does not pass the schema", async () => {
    await expect(
      createShare(db, {
        uid: "alice",
        runId: "run-1",
        run: { ...RUN, apiKey: "sk-x" } as SharedRun,
        now: NOW,
      }),
    ).rejects.toThrow();
  });

  it("lets only the owner delete a share", async () => {
    const link = await createShare(db, {
      uid: "alice",
      runId: "run-1",
      run: RUN,
      now: NOW,
    });
    await expect(deleteShare(db, "bob", link.id)).rejects.toBeInstanceOf(
      ShareNotFoundError,
    );
    expect(await getShare(db, link.id, NOW)).not.toBeNull();
    await deleteShare(db, "alice", link.id);
    expect(await getShare(db, link.id, NOW)).toBeNull();
    await expect(deleteShare(db, "alice", link.id)).rejects.toBeInstanceOf(
      ShareNotFoundError,
    );
  });

  it("limits how many links one user creates per window", async () => {
    const rate = { limit: 2, windowSeconds: 3600 };
    await createShare(db, {
      uid: "alice",
      runId: "run-1",
      run: RUN,
      rate,
      now: NOW,
    });
    await createShare(db, {
      uid: "alice",
      runId: "run-2",
      run: RUN,
      rate,
      now: NOW,
    });
    await expect(
      createShare(db, {
        uid: "alice",
        runId: "run-3",
        run: RUN,
        rate,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(RateLimitError);
    // Another user has their own limit.
    await createShare(db, {
      uid: "bob",
      runId: "run-3",
      run: RUN,
      rate,
      now: NOW,
    });
  });
});
