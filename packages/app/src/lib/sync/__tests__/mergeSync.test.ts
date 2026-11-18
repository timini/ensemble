import { describe, expect, it } from "vitest";
import { mergeSync, parseSyncPayload, toSyncPayload } from "../mergeSync";

interface Item {
  id: string;
  at: number;
  text?: string;
  embeddings?: number[];
}
const stamp = (i: Item) => i.at;
const payload = (i: Item) => ({
  id: i.id,
  updatedAt: i.at,
  payload: JSON.stringify(i),
});

describe("mergeSync", () => {
  it("adds account items, keeps local-only items and uploads them", () => {
    const { merged, upload } = mergeSync<Item>(
      [{ id: "a", at: 1 }],
      { items: [payload({ id: "b", at: 2 })], deleted: [] },
      stamp,
      parseSyncPayload,
    );
    expect(merged.map((i) => i.id)).toEqual(["a", "b"]);
    expect(upload.map((i) => i.id)).toEqual(["a"]);
  });

  it("keeps the newer copy of an item", () => {
    const { merged, upload } = mergeSync<Item>(
      [
        { id: "a", at: 5, text: "local" },
        { id: "b", at: 1, text: "local" },
        { id: "c", at: 3, text: "same" },
      ],
      {
        items: [
          payload({ id: "a", at: 4, text: "account" }),
          payload({ id: "b", at: 2, text: "account" }),
          payload({ id: "c", at: 3, text: "same" }),
        ],
        deleted: [],
      },
      stamp,
      parseSyncPayload,
    );
    expect(merged.map((i) => i.text)).toEqual(["local", "account", "same"]);
    expect(upload.map((i) => i.id)).toEqual(["a"]);
  });

  it("drops an item deleted on another device unless it changed here since", () => {
    const { merged, upload } = mergeSync<Item>(
      [
        { id: "a", at: 1 },
        { id: "b", at: 9 },
      ],
      {
        items: [],
        deleted: [
          { id: "a", deletedAt: 5 },
          { id: "b", deletedAt: 5 },
        ],
      },
      stamp,
      parseSyncPayload,
    );
    expect(merged.map((i) => i.id)).toEqual(["b"]);
    expect(upload.map((i) => i.id)).toEqual(["b"]);
  });

  it("skips account items that do not parse", () => {
    const { merged } = mergeSync<Item>(
      [],
      { items: [{ id: "x", updatedAt: 1, payload: "{" }], deleted: [] },
      stamp,
      parseSyncPayload,
    );
    expect(merged).toEqual([]);
  });
});

describe("toSyncPayload", () => {
  it("strips secrets and falls back to a slim copy when too large", () => {
    expect(
      JSON.parse(toSyncPayload("presets", { id: "p", apiKey: "sk" })!),
    ).toEqual({ id: "p" });
    const big = {
      id: "r",
      at: 1,
      embeddings: Array.from({ length: 200_000 }, () => 0.123456),
    };
    const slim = toSyncPayload("history", big, (i) => ({
      ...i,
      embeddings: [],
    }));
    expect(JSON.parse(slim!)).toEqual({ id: "r", at: 1, embeddings: [] });
    expect(toSyncPayload("history", big)).toBeNull();
  });
});
