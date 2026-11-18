// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "~/server/auth/firebaseAdmin";

const { verifyMock, accountMock, historyMock } = vi.hoisted(() => ({
  verifyMock: vi.fn<(token: string) => Promise<AuthUser | null>>(),
  accountMock: vi.fn(),
  historyMock: {
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
vi.mock("~/server/credits/creditService", () => ({
  getCreditAccount: accountMock,
}));
vi.mock("~/server/credits/accountHistory", () => historyMock);

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

async function caller(token?: string) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return createCaller(await createTRPCContext({ headers }));
}

describe("credits router", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    accountMock.mockReset();
    verifyMock.mockResolvedValue({ uid: "user-1" });
  });

  it("lists the credit packs to anyone", async () => {
    const packs = await (await caller()).credits.packs();
    expect(packs.map((p) => p.amountCents)).toEqual([500, 2000, 5000]);
  });

  it("needs a signed-in user for the balance", async () => {
    verifyMock.mockResolvedValue(null);
    await expect((await caller("bad")).credits.account()).rejects.toMatchObject(
      { code: "UNAUTHORIZED" },
    );
  });

  it("returns the balance with the low-balance flag", async () => {
    accountMock.mockResolvedValue({
      uid: "user-1",
      balanceMicros: 500_000,
      lowBalance: true,
      lowBalanceThresholdMicros: 1_000_000,
    });
    const account = await (await caller("good")).credits.account();
    expect(accountMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "user-1",
    );
    expect(account).toMatchObject({ balanceMicros: 500_000, lowBalance: true });
  });

  it("quotes a run against the balance", async () => {
    accountMock.mockResolvedValue({
      uid: "user-1",
      balanceMicros: 0,
      lowBalance: true,
      lowBalanceThresholdMicros: 1_000_000,
    });
    const quote = await (
      await caller("good")
    ).credits.quote({
      models: [{ provider: "nobody", modelId: "unpriced" }],
      consensusMethod: "standard",
      summarizer: null,
      eloTopN: 3,
      embeddings: null,
      promptTokens: 10,
    });
    expect(quote).toEqual({
      status: "unpriced",
      models: ["nobody/unpriced"],
      balanceMicros: 0,
    });
  });

  it("rejects an oversized quote request", async () => {
    await expect(
      (await caller("good")).credits.quote({
        models: [],
        consensusMethod: "standard",
        summarizer: null,
        eloTopN: 3,
        embeddings: null,
        promptTokens: 10,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
