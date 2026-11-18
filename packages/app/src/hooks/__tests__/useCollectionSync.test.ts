import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncSnapshot } from "~/lib/sync/syncItems";
import {
  syncOwnerKey,
  useCollectionSync,
  type SyncApi,
} from "../useCollectionSync";

interface Item {
  id: string;
  at: number;
  name?: string;
  apiKey?: string;
}

function fakeApi(remote: SyncSnapshot = { items: [], deleted: [] }) {
  const api = {
    list: vi.fn(async () => remote),
    upsert: vi.fn(async () => ({})),
    remove: vi.fn(async () => ({})),
  } satisfies SyncApi;
  return api;
}

function setup(initial: {
  uid: string | null;
  items: Item[];
  api: SyncApi;
  apply?: (merged: Item[]) => void | Promise<void>;
  retryMs?: number;
}) {
  const apply = vi.fn(initial.apply ?? (() => undefined));
  const hook = renderHook(
    (props: { uid: string | null; items: Item[] }) =>
      useCollectionSync<Item>({
        kind: "presets",
        uid: props.uid,
        ready: true,
        items: props.items,
        stamp: (i) => i.at,
        apply,
        api: initial.api,
        debounceMs: 10,
        retryMs: initial.retryMs ?? 20,
      }),
    { initialProps: { uid: initial.uid, items: initial.items } },
  );
  return { ...hook, apply };
}

const remoteItem = (i: Item) => ({
  id: i.id,
  updatedAt: i.at,
  payload: JSON.stringify(i),
});

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => void stored.set(k, v),
    removeItem: (k: string) => void stored.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("useCollectionSync", () => {
  it("does nothing while signed out", async () => {
    const api = fakeApi();
    const { result } = setup({ uid: null, items: [{ id: "a", at: 1 }], api });
    await new Promise((r) => setTimeout(r, 30));
    expect(api.list).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("merges on sign-in, uploads local items without keys and remembers the account", async () => {
    const api = fakeApi({
      items: [remoteItem({ id: "b", at: 2 })],
      deleted: [],
    });
    const { result, apply } = setup({
      uid: "u1",
      items: [{ id: "a", at: 1, apiKey: "sk-1" }],
      api,
    });
    await waitFor(() => expect(result.current).toBe(true));
    expect(apply.mock.calls[0]![0].map((i) => i.id)).toEqual(["a", "b"]);
    expect(api.upsert).toHaveBeenCalledWith("presets", [
      { id: "a", updatedAt: 1, payload: JSON.stringify({ id: "a", at: 1 }) },
    ]);
    expect(localStorage.getItem(syncOwnerKey("presets"))).toBe("u1");
  });

  it("replaces another account's items instead of uploading them", async () => {
    localStorage.setItem(syncOwnerKey("presets"), "someone-else");
    const api = fakeApi({
      items: [remoteItem({ id: "b", at: 2 })],
      deleted: [],
    });
    const { result, apply } = setup({
      uid: "u1",
      items: [{ id: "a", at: 1 }],
      api,
    });
    await waitFor(() => expect(result.current).toBe(true));
    expect(apply.mock.calls[0]![0].map((i) => i.id)).toEqual(["b"]);
    expect(api.upsert).not.toHaveBeenCalled();
  });

  it("sends changes and deletes made after the merge", async () => {
    const a = { id: "a", at: 1 };
    const b = { id: "b", at: 1 };
    const api = fakeApi({ items: [remoteItem(a), remoteItem(b)], deleted: [] });
    const { result, rerender, apply } = setup({
      uid: "u1",
      items: [a, b],
      api,
    });
    await waitFor(() => expect(result.current).toBe(true));
    const [mergedA, mergedB] = apply.mock.calls[0]![0];
    // The merged items are what the browser now holds: no echo.
    rerender({ uid: "u1", items: [mergedA!, mergedB!] });
    await new Promise((r) => setTimeout(r, 30));
    expect(api.upsert).not.toHaveBeenCalled();

    const changed = { ...mergedA!, at: 5, name: "renamed" };
    act(() => rerender({ uid: "u1", items: [changed] }));
    await waitFor(() =>
      expect(api.remove).toHaveBeenCalledWith("presets", ["b"]),
    );
    expect(api.upsert).toHaveBeenCalledWith("presets", [
      { id: "a", updatedAt: 5, payload: JSON.stringify(changed) },
    ]);
  });

  it("stops syncing on sign-out", async () => {
    const api = fakeApi();
    const { result, rerender } = setup({ uid: "u1", items: [], api });
    await waitFor(() => expect(result.current).toBe(true));
    rerender({ uid: null, items: [{ id: "x", at: 9 }] });
    await new Promise((r) => setTimeout(r, 30));
    expect(result.current).toBe(false);
    expect(api.upsert).not.toHaveBeenCalled();
  });

  it("merges items added while the account's list was loading", async () => {
    let release: (snap: SyncSnapshot) => void = () => undefined;
    const api = fakeApi();
    api.list.mockImplementation(
      () => new Promise<SyncSnapshot>((resolve) => (release = resolve)),
    );
    const { result, rerender, apply } = setup({ uid: "u1", items: [], api });
    rerender({ uid: "u1", items: [{ id: "late", at: 4 }] });
    release({ items: [], deleted: [] });
    await waitFor(() => expect(result.current).toBe(true));
    expect(apply.mock.calls[0]![0].map((i) => i.id)).toEqual(["late"]);
    expect(api.upsert).toHaveBeenCalledWith("presets", [
      {
        id: "late",
        updatedAt: 4,
        payload: JSON.stringify({ id: "late", at: 4 }),
      },
    ]);
  });

  it("sends nothing for an account once it signs out during the merge", async () => {
    let release: () => void = () => undefined;
    const api = fakeApi();
    const { rerender } = setup({
      uid: "u1",
      items: [{ id: "a", at: 1 }],
      api,
      apply: () => new Promise<void>((resolve) => (release = resolve)),
    });
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    rerender({ uid: null, items: [{ id: "a", at: 1 }] });
    release();
    await new Promise((r) => setTimeout(r, 30));
    expect(api.upsert).not.toHaveBeenCalled();
    expect(localStorage.getItem(syncOwnerKey("presets"))).toBeNull();
  });

  it("stops uploading batches once the account signs out", async () => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      id: `i${i}`,
      at: 1,
    }));
    let release: () => void = () => undefined;
    const api = fakeApi();
    api.upsert.mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve({}))),
    );
    const { rerender } = setup({ uid: "u1", items, api });
    await waitFor(() => expect(api.upsert).toHaveBeenCalledTimes(1));
    rerender({ uid: null, items });
    release();
    await new Promise((r) => setTimeout(r, 30));
    expect(api.upsert).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed delete and sends it again later", async () => {
    const a = { id: "a", at: 1 };
    const b = { id: "b", at: 1 };
    const api = fakeApi({ items: [remoteItem(a), remoteItem(b)], deleted: [] });
    api.remove.mockRejectedValueOnce(new Error("offline"));
    const { result, rerender, apply } = setup({
      uid: "u1",
      items: [a, b],
      api,
    });
    await waitFor(() => expect(result.current).toBe(true));
    const [mergedA] = apply.mock.calls[0]![0];
    act(() => rerender({ uid: "u1", items: [mergedA!] }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledTimes(2));
    expect(api.remove).toHaveBeenLastCalledWith("presets", ["b"]);
  });

  it("keeps a failed change and sends it with the next one", async () => {
    const a = { id: "a", at: 1 };
    const api = fakeApi({ items: [remoteItem(a)], deleted: [] });
    api.upsert.mockRejectedValueOnce(new Error("offline"));
    const { result, rerender, apply } = setup({
      uid: "u1",
      items: [a],
      api,
      retryMs: 60_000,
    });
    await waitFor(() => expect(result.current).toBe(true));
    const [mergedA] = apply.mock.calls[0]![0];
    const changed = { ...mergedA!, at: 5 };
    act(() => rerender({ uid: "u1", items: [changed] }));
    await waitFor(() => expect(api.upsert).toHaveBeenCalledTimes(1));
    const added = { id: "c", at: 6 };
    act(() => rerender({ uid: "u1", items: [changed, added] }));
    await waitFor(() => expect(api.upsert).toHaveBeenCalledTimes(2));
    expect(api.upsert).toHaveBeenLastCalledWith("presets", [
      { id: "a", updatedAt: 5, payload: JSON.stringify(changed) },
      { id: "c", updatedAt: 6, payload: JSON.stringify(added) },
    ]);
  });
});
