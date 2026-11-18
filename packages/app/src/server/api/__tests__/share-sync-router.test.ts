// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "~/server/auth/firebaseAdmin";
import type { SharedRun } from "~/lib/share/sharedRun";
import type * as ShareStore from "~/server/share/shareStore";
import type * as SyncStore from "~/server/sync/syncStore";
import type * as RateLimit from "~/server/pro/rateLimit";

const { verifyMock, shares, sync, rate } = vi.hoisted(() => ({
  verifyMock: vi.fn<(token: string) => Promise<AuthUser | null>>(),
  shares: {
    createShare: vi.fn(),
    deleteShare: vi.fn(),
    findShareForRun: vi.fn(),
  },
  sync: {
    listSyncItems: vi.fn(),
    upsertSyncItems: vi.fn(),
    removeSyncItems: vi.fn(),
  },
  rate: { takeRateSlot: vi.fn() },
}));

vi.mock("~/server/auth/firebaseAdmin", () => ({
  verifyFirebaseAuthToken: verifyMock,
  getFirebaseApp: vi.fn(),
}));
vi.mock("~/server/firebase/firestore", () => ({
  getAdminFirestore: () => ({}),
}));
vi.mock("~/server/share/shareStore", async (orig) => ({
  ...(await orig<typeof ShareStore>()),
  ...shares,
}));
vi.mock("~/server/sync/syncStore", async (orig) => ({
  ...(await orig<typeof SyncStore>()),
  ...sync,
}));
vi.mock("~/server/pro/rateLimit", async (orig) => ({
  ...(await orig<typeof RateLimit>()),
  ...rate,
}));

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { RateLimitError } from "~/server/pro/rateLimit";
import { ShareNotFoundError } from "~/server/share/shareStore";

async function caller(token?: string) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return createCaller(await createTRPCContext({ headers }));
}

const RUN: SharedRun = {
  v: 1,
  prompt: "Q",
  runAt: 1,
  method: "standard",
  consensus: null,
  agreement: null,
  answers: [{ id: "a", modelName: "A", status: "complete", content: "x" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyMock.mockResolvedValue({ uid: "user-1" });
});

describe("share router", () => {
  it("needs a signed-in user for every call", async () => {
    verifyMock.mockResolvedValue(null);
    const api = await caller("bad");
    await expect(
      api.share.create({ runId: "run-1", run: RUN }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(api.share.forRun({ runId: "run-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      api.share.delete({ id: "a".repeat(22) }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("creates a link for the caller's run", async () => {
    shares.createShare.mockResolvedValue({ id: "x".repeat(22), expiresAt: 5 });
    const api = await caller("good");
    await expect(
      api.share.create({ runId: "run-1", run: RUN }),
    ).resolves.toEqual({ id: "x".repeat(22), expiresAt: 5 });
    expect(shares.createShare).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uid: "user-1", runId: "run-1", run: RUN }),
    );
  });

  it("refuses extra fields in the shared run", async () => {
    const api = await caller("good");
    await expect(
      api.share.create({
        runId: "run-1",
        run: { ...RUN, apiKey: "sk" } as SharedRun,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(shares.createShare).not.toHaveBeenCalled();
  });

  it("maps the share limit and missing shares to tRPC codes", async () => {
    shares.createShare.mockRejectedValue(
      new RateLimitError(60, "shared links"),
    );
    shares.deleteShare.mockRejectedValue(new ShareNotFoundError());
    const api = await caller("good");
    await expect(
      api.share.create({ runId: "run-1", run: RUN }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    await expect(
      api.share.delete({ id: "a".repeat(22) }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("sync router", () => {
  it("needs a signed-in user", async () => {
    verifyMock.mockResolvedValue(null);
    const api = await caller();
    await expect(api.sync.list({ kind: "history" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("lists, uploads and deletes for the caller, counting writes against the limit", async () => {
    sync.listSyncItems.mockResolvedValue({ items: [], deleted: [] });
    sync.upsertSyncItems.mockResolvedValue(["p1"]);
    const api = await caller("good");
    await api.sync.list({ kind: "presets" });
    expect(sync.listSyncItems).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "presets",
    );
    await expect(
      api.sync.upsert({
        kind: "presets",
        items: [{ id: "p1", updatedAt: 1, payload: "{}" }],
      }),
    ).resolves.toEqual({ written: ["p1"] });
    await api.sync.remove({ kind: "history", ids: ["run-1"] });
    expect(sync.removeSyncItems).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "history",
      ["run-1"],
    );
    expect(rate.takeRateSlot).toHaveBeenCalledTimes(2);
    expect(rate.takeRateSlot).toHaveBeenCalledWith(
      expect.anything(),
      "sync__user-1",
      expect.anything(),
      "sync writes",
    );
  });

  it("answers TOO_MANY_REQUESTS past the write limit", async () => {
    rate.takeRateSlot.mockRejectedValueOnce(
      new RateLimitError(30, "sync writes"),
    );
    const api = await caller("good");
    await expect(
      api.sync.remove({ kind: "history", ids: ["run-1"] }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(sync.removeSyncItems).not.toHaveBeenCalled();
  });
});
