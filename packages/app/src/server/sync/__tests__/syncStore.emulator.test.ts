import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  listSyncItems,
  removeSyncItems,
  SyncItemError,
  upsertSyncItems,
} from "../syncStore";

const app = initializeApp({ projectId: "demo-ensemble" }, "sync-test");
const db = getFirestore(app);

const run = (id: string, updatedAt: number, extra: object = {}) => ({
  id,
  updatedAt,
  payload: JSON.stringify({
    id,
    prompt: `Prompt ${id}`,
    matrix: [
      [1, 0.5],
      [0.5, 1],
    ],
    ...extra,
  }),
});

beforeEach(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) throw new Error("FIRESTORE_EMULATOR_HOST is not set");
  await fetch(
    `http://${host}/emulator/v1/projects/demo-ensemble/databases/(default)/documents`,
    { method: "DELETE" },
  );
});
afterAll(() => deleteApp(app));

describe("sync store", () => {
  it("stores items per user and lists them newest first", async () => {
    await upsertSyncItems(db, "alice", "history", [
      run("run-1", 10),
      run("run-2", 20),
    ]);
    await upsertSyncItems(db, "bob", "history", [run("run-9", 30)]);
    const list = await listSyncItems(db, "alice", "history");
    expect(list.items.map((i) => i.id)).toEqual(["run-2", "run-1"]);
    expect(
      (JSON.parse(list.items[0]!.payload) as { matrix: number[][] }).matrix,
    ).toEqual([
      [1, 0.5],
      [0.5, 1],
    ]);
    expect(list.deleted).toEqual([]);
  });

  it("keeps the newest write", async () => {
    await upsertSyncItems(db, "alice", "history", [
      run("run-1", 20, { prompt: "new" }),
    ]);
    const written = await upsertSyncItems(db, "alice", "history", [
      run("run-1", 10, { prompt: "old" }),
    ]);
    expect(written).toEqual([]);
    const [item] = (await listSyncItems(db, "alice", "history")).items;
    expect((JSON.parse(item!.payload) as { prompt: string }).prompt).toBe(
      "new",
    );
  });

  it("leaves a tombstone that no later write undoes", async () => {
    await upsertSyncItems(db, "alice", "presets", [run("p1", 10)]);
    await removeSyncItems(db, "alice", "presets", ["p1"], 50);
    await upsertSyncItems(db, "alice", "presets", [run("p1", 40)]);
    expect(await listSyncItems(db, "alice", "presets")).toEqual({
      items: [],
      deleted: [{ id: "p1", deletedAt: 50 }],
    });
    // Not even a newer write brings it back: deleted ids are never reused.
    await upsertSyncItems(db, "alice", "presets", [run("p1", 60)]);
    expect((await listSyncItems(db, "alice", "presets")).items).toHaveLength(0);
  });

  it("refuses secrets, mismatched ids, oversize items and big batches", async () => {
    await expect(
      upsertSyncItems(db, "alice", "presets", [
        run("p1", 1, { apiKey: "sk-x" }),
      ]),
    ).rejects.toBeInstanceOf(SyncItemError);
    await expect(
      upsertSyncItems(db, "alice", "presets", [
        { id: "p1", updatedAt: 1, payload: JSON.stringify({ id: "p2" }) },
      ]),
    ).rejects.toBeInstanceOf(SyncItemError);
    await expect(
      upsertSyncItems(db, "alice", "presets", [
        run("p1", 1, { name: "x".repeat(30_000) }),
      ]),
    ).rejects.toBeInstanceOf(SyncItemError);
    await expect(
      upsertSyncItems(
        db,
        "alice",
        "history",
        Array.from({ length: 6 }, (_, i) => run(`r${i}`, i)),
      ),
    ).rejects.toBeInstanceOf(SyncItemError);
    await expect(
      upsertSyncItems(db, "alice", "history", [run("a__b", 1)]),
    ).rejects.toBeInstanceOf(SyncItemError);
    expect((await listSyncItems(db, "alice", "presets")).items).toEqual([]);
  });
});
