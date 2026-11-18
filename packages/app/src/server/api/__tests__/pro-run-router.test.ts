// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "~/server/auth/firebaseAdmin";
import { DEFAULT_PRO_CONFIG } from "~/server/pro/config";

const mocks = vi.hoisted(() => ({
  verify: vi.fn<(token: string) => Promise<AuthUser | null>>(),
  appCheck: vi.fn<(token: string | null) => Promise<boolean>>(),
  listModels: vi.fn<(provider: string) => Promise<string[]>>(),
  stream: vi.fn(),
  structured: vi.fn(),
  embed: vi.fn(),
  start: vi.fn(),
  close: vi.fn(),
  config: { appCheckEnforce: false },
}));

vi.mock("~/server/auth/firebaseAdmin", () => ({
  verifyFirebaseAuthToken: mocks.verify,
  getFirebaseApp: vi.fn(),
}));
vi.mock("~/server/pro/appCheck", () => ({
  APP_CHECK_HEADER: "x-firebase-appcheck",
  verifyAppCheckToken: mocks.appCheck,
}));
vi.mock("~/server/pro", () => ({
  getProConfig: () => ({ ...DEFAULT_PRO_CONFIG, ...mocks.config }),
  getProDeps: () => ({ deps: true }),
}));
vi.mock("~/server/firebase/firestore", () => ({
  getAdminFirestore: () => ({}),
}));
vi.mock("~/server/providers/providerService", () => ({
  listProviderTextModels: mocks.listModels,
}));
vi.mock("~/server/pro/proCalls", () => ({
  streamProCall: mocks.stream,
  structuredProCall: mocks.structured,
  embedProCall: mocks.embed,
}));
vi.mock("~/server/pro/proRunService", () => ({
  startProRun: mocks.start,
  closeProRun: mocks.close,
}));

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const CALL = {
  runId: "run-1",
  callId: "call-1",
  provider: "openai" as const,
  model: "gpt-5-mini",
  prompt: "Say hello",
};

const RUN = {
  runId: "run-1",
  models: [{ provider: "openai", modelId: "gpt-5-mini" }],
  consensusMethod: "standard" as const,
  summarizer: null,
  eloTopN: 0,
  embeddings: null,
  promptTokens: 10,
};

async function caller(headers: Record<string, string> = {}) {
  return createCaller(
    await createTRPCContext({ headers: new Headers(headers) }),
  );
}

describe("proRun router and App Check", () => {
  beforeEach(() => {
    Object.values(mocks).forEach(
      (m) => typeof m === "function" && m.mockReset(),
    );
    mocks.config.appCheckEnforce = false;
    mocks.verify.mockResolvedValue({ uid: "user-1" });
  });

  it("requires a valid App Check token when enforcement is on", async () => {
    mocks.config.appCheckEnforce = true;
    mocks.appCheck.mockResolvedValue(false);
    const c = await caller({ authorization: "Bearer ok" });
    await expect(c.proRun.start(RUN)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.appCheck).toHaveBeenCalledWith(null);

    mocks.appCheck.mockResolvedValue(true);
    mocks.start.mockResolvedValue({
      runId: "run-1",
      reservedMicros: 10,
      balanceMicros: 90,
    });
    const withToken = await caller({
      authorization: "Bearer ok",
      "x-firebase-appcheck": "tok",
    });
    await expect(withToken.proRun.start(RUN)).resolves.toMatchObject({
      reservedMicros: 10,
    });
    expect(mocks.appCheck).toHaveBeenLastCalledWith("tok");
  });

  it("does not check App Check while enforcement is off", async () => {
    mocks.start.mockResolvedValue({
      runId: "run-1",
      reservedMicros: 10,
      balanceMicros: 90,
    });
    await (await caller({ authorization: "Bearer ok" })).proRun.start(RUN);
    expect(mocks.appCheck).not.toHaveBeenCalled();
    expect(mocks.start).toHaveBeenCalledWith({ deps: true }, "user-1", {
      runId: "run-1",
      run: {
        models: RUN.models,
        consensusMethod: "standard",
        summarizer: null,
        eloTopN: 0,
        embeddings: null,
        promptTokens: 10,
      },
    });
  });

  it("finishes a run and returns the outcome", async () => {
    mocks.close.mockResolvedValue({
      outcome: { type: "refunded", refundedMicros: 5 },
      balanceMicros: 100,
    });
    const result = await (
      await caller({ authorization: "Bearer ok" })
    ).proRun.finish({
      runId: "run-1",
      reason: "cancelled",
    });
    expect(result.outcome).toEqual({ type: "refunded", refundedMicros: 5 });
    expect(mocks.close).toHaveBeenCalledWith(
      { deps: true },
      "user-1",
      "run-1",
      { reason: "cancelled" },
    );
  });

  it("refuses unsafe run ids", async () => {
    const c = await caller({ authorization: "Bearer ok" });
    await expect(
      c.proRun.finish({ runId: "a/b", reason: "done" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      c.provider.streamTextEvents({ ...CALL, callId: "x__y" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
