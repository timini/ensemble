import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  HISTORY_LIMIT,
  clearRuns,
  deleteRun,
  getRun,
  historyAvailable,
  listRuns,
  saveRun,
  type StoredRun,
} from "../runHistory";

function run(overrides: Partial<StoredRun> = {}): StoredRun {
  return {
    id: "run-1",
    createdAt: 1_000,
    prompt: "What is 6 times 7?",
    models: [{ id: "a", provider: "openai", model: "gpt-6-astra" }],
    consensusMethod: "standard",
    summarizerModel: null,
    responses: [],
    manualResponses: [],
    embeddings: [],
    embeddingsSource: null,
    similarityMatrix: null,
    agreementStats: null,
    metaAnalysis: "42",
    majorityVote: null,
    consensusUsage: [],
    agreementScore: 0.9,
    agreementLevel: "high",
    costUsd: 0.0042,
    ...overrides,
  };
}

describe("runHistory", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it("reports whether IndexedDB is there", () => {
    expect(historyAvailable()).toBe(true);
  });

  it("saves runs and lists them newest first", async () => {
    await saveRun(run({ id: "old", createdAt: 1_000 }));
    await saveRun(run({ id: "new", createdAt: 2_000 }));
    const runs = await listRuns();
    expect(runs.map((r) => r.id)).toEqual(["new", "old"]);
    expect(runs[0]).toMatchObject({
      prompt: "What is 6 times 7?",
      costUsd: 0.0042,
    });
  });

  it("replaces a run saved again under the same id", async () => {
    await saveRun(run({ metaAnalysis: null }));
    await saveRun(run({ metaAnalysis: "42" }));
    const runs = await listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]!.metaAnalysis).toBe("42");
  });

  it("gets and deletes one run", async () => {
    await saveRun(run({ id: "a" }));
    await saveRun(run({ id: "b" }));
    expect((await getRun("a"))?.id).toBe("a");
    await deleteRun("a");
    expect(await getRun("a")).toBeUndefined();
    expect((await listRuns()).map((r) => r.id)).toEqual(["b"]);
  });

  it("clears every run", async () => {
    await saveRun(run({ id: "a" }));
    await clearRuns();
    expect(await listRuns()).toEqual([]);
  });

  it(`keeps only the newest ${HISTORY_LIMIT} runs`, async () => {
    for (let i = 0; i < HISTORY_LIMIT + 2; i++) {
      await saveRun(run({ id: `r${i}`, createdAt: i }));
    }
    const runs = await listRuns();
    expect(runs).toHaveLength(HISTORY_LIMIT);
    expect(runs.at(-1)!.id).toBe("r2");
  });

  it("does nothing and lists nothing without IndexedDB", async () => {
    // @ts-expect-error simulating a browser with IndexedDB blocked
    globalThis.indexedDB = undefined;
    expect(historyAvailable()).toBe(false);
    await expect(saveRun(run())).resolves.toBeUndefined();
    await expect(listRuns()).resolves.toEqual([]);
  });
});
