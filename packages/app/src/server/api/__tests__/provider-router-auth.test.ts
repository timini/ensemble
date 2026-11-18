// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "~/server/auth/firebaseAdmin";
import { ProviderError } from "@ensemble-ai/shared-utils/providers";
import { InsufficientCreditsError } from "~/server/credits/errors";
import { RateLimitError } from "~/server/pro/rateLimit";
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
vi.mock("~/server/firebase/firestore", () => ({ getAdminFirestore: () => ({}) }));
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
  return createCaller(await createTRPCContext({ headers: new Headers(headers) }));
}

async function drain(iterable: unknown) {
  const out: unknown[] = [];
  for await (const e of iterable as AsyncIterable<unknown>) out.push(e);
  return out;
}

describe("provider router", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => typeof m === "function" && m.mockReset());
    mocks.config.appCheckEnforce = false;
    mocks.verify.mockResolvedValue({ uid: "user-1" });
  });

  it("refuses every Pro call without a signed-in user", async () => {
    mocks.verify.mockResolvedValue(null);
    const c = await caller({ authorization: "Bearer bad" });
    await expect(c.provider.streamTextEvents(CALL)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      c.provider.generateStructured({ ...CALL, schema: { name: "s", schema: {} } }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      c.provider.generateEmbeddings({ runId: "r", callId: "c", provider: "openai", text: "t" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(c.proRun.start(RUN)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("streams the chunk and complete events of a Pro call", async () => {
    mocks.stream.mockImplementation(async function* () {
      yield { type: "chunk", chunk: "Hel" };
      yield { type: "chunk", chunk: "lo" };
      yield { type: "complete", response: "Hello", responseTimeMs: 5 };
    });
    const events = await drain(await (await caller({ authorization: "Bearer ok" })).provider.streamTextEvents(CALL));
    expect(events).toEqual([
      { type: "chunk", chunk: "Hel" },
      { type: "chunk", chunk: "lo" },
      { type: "complete", response: "Hello", responseTimeMs: 5 },
    ]);
    expect(mocks.stream.mock.calls[0]?.slice(0, 3)).toEqual([{ deps: true }, "user-1", CALL]);
  });

  it("maps billing and provider failures to tRPC codes", async () => {
    const c = await caller({ authorization: "Bearer ok" });
    mocks.start.mockRejectedValueOnce(new InsufficientCreditsError(10, 100));
    await expect(c.proRun.start(RUN)).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    mocks.start.mockRejectedValueOnce(new RateLimitError(30));
    await expect(c.proRun.start(RUN)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    mocks.structured.mockRejectedValueOnce(new ProviderError("slow", "timeout"));
    await expect(
      c.provider.generateStructured({ ...CALL, schema: { name: "s", schema: {} } }),
    ).rejects.toMatchObject({ code: "GATEWAY_TIMEOUT" });
    mocks.stream.mockImplementation(async function* () {
      yield { type: "chunk", chunk: "x" };
      throw new ProviderError("busy", "rate_limited", { retryAfterSeconds: 7 });
    });
    await expect(drain(await c.provider.streamTextEvents(CALL))).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });
});
