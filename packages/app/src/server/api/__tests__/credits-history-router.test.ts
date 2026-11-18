// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "~/server/auth/firebaseAdmin";

const { verifyMock, history } = vi.hoisted(() => ({
  verifyMock: vi.fn<(token: string) => Promise<AuthUser | null>>(),
  history: {
    listPurchases: vi.fn(),
    listRuns: vi.fn(),
    modelUsageSince: vi.fn(),
  },
}));

vi.mock("~/server/auth/firebaseAdmin", () => ({
  verifyFirebaseAuthToken: verifyMock,
  getFirebaseApp: vi.fn(),
}));
vi.mock("~/server/firebase/firestore", () => ({
  getAdminFirestore: () => ({}),
}));
vi.mock("~/server/credits/accountHistory", () => history);

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

async function caller(token?: string) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return createCaller(await createTRPCContext({ headers }));
}

describe("credits router: account history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock.mockResolvedValue({ uid: "user-1" });
  });

  it("needs a signed-in user", async () => {
    verifyMock.mockResolvedValue(null);
    const api = await caller("bad");
    await expect(api.credits.purchases({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(api.credits.runs({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(api.credits.usageByModel({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("pages the signed-in user's purchases and runs, ten at a time by default", async () => {
    history.listPurchases.mockResolvedValue({ items: [], nextCursor: null });
    history.listRuns.mockResolvedValue({ items: [], nextCursor: "run-9" });
    const api = await caller("good");
    await api.credits.purchases({ cursor: "purchase__cs_1" });
    expect(history.listPurchases).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      { cursor: "purchase__cs_1", limit: 10 },
    );
    expect(await api.credits.runs({ limit: 5 })).toEqual({
      items: [],
      nextCursor: "run-9",
    });
    expect(history.listRuns).toHaveBeenCalledWith(expect.anything(), "user-1", {
      limit: 5,
    });
  });

  it("refuses a cursor that is not a plain id and a page that is too large", async () => {
    const api = await caller("good");
    await expect(
      api.credits.purchases({ cursor: "users/other" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(api.credits.runs({ limit: 500 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      api.credits.runs({ cursor: "r".repeat(129) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sums usage by model over the last 30 days by default", async () => {
    history.modelUsageSince.mockResolvedValue({
      sinceMs: 0,
      runCount: 0,
      truncated: false,
      models: [],
    });
    const before = Date.now();
    await (await caller("good")).credits.usageByModel({});
    const [, uid, options] = history.modelUsageSince.mock.calls[0] as [
      unknown,
      string,
      { sinceMs: number },
    ];
    expect(uid).toBe("user-1");
    expect(options.sinceMs).toBeGreaterThanOrEqual(
      before - 30 * 24 * 60 * 60 * 1000,
    );
    expect(options.sinceMs).toBeLessThanOrEqual(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    );
  });
});
