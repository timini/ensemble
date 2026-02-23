import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "~/server/auth/firebaseAdmin";

const {
  verifyFirebaseAuthTokenMock,
  listProviderTextModelsMock,
  streamProviderResponseMock,
} = vi.hoisted(() => ({
  verifyFirebaseAuthTokenMock: vi.fn<
    (token: string) => Promise<AuthUser | null>
  >(),
  listProviderTextModelsMock: vi.fn<
    (provider: string) => Promise<string[]>
  >(),
  streamProviderResponseMock: vi.fn<
    (input: {
      provider: string;
      model: string;
      prompt: string;
      temperature?: number;
    }) => Promise<{ response: string; responseTimeMs: number; tokenCount?: number }>
  >(),
}));

vi.mock("~/server/auth/firebaseAdmin", () => ({
  verifyFirebaseAuthToken: verifyFirebaseAuthTokenMock,
}));

vi.mock("~/server/providers/providerService", () => ({
  listProviderTextModels: listProviderTextModelsMock,
  streamProviderResponse: streamProviderResponseMock,
}));

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

describe("provider router auth enforcement", () => {
  beforeEach(() => {
    verifyFirebaseAuthTokenMock.mockReset();
    listProviderTextModelsMock.mockReset();
    streamProviderResponseMock.mockReset();
  });

  it("blocks unauthenticated listTextModels requests and does not call provider service", async () => {
    const ctx = await createTRPCContext({ headers: new Headers() });
    const caller = createCaller(ctx);

    await expect(
      caller.provider.listTextModels({ provider: "openai" }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
    expect(listProviderTextModelsMock).not.toHaveBeenCalled();
  });

  it("blocks invalid-token streamText requests and does not call provider service", async () => {
    verifyFirebaseAuthTokenMock.mockResolvedValueOnce(null);

    const ctx = await createTRPCContext({
      headers: new Headers({
        authorization: "Bearer invalid-token",
      }),
    });
    const caller = createCaller(ctx);

    await expect(
      caller.provider.streamText({
        provider: "google",
        model: "gemini-1.5-pro",
        prompt: "test",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
    expect(verifyFirebaseAuthTokenMock).toHaveBeenCalledWith("invalid-token");
    expect(streamProviderResponseMock).not.toHaveBeenCalled();
  });

  it("allows authenticated listTextModels and streamText requests", async () => {
    verifyFirebaseAuthTokenMock.mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
    });
    listProviderTextModelsMock.mockResolvedValue(["gpt-4o", "gpt-4o-mini"]);
    streamProviderResponseMock.mockResolvedValue({
      response: "hello from provider",
      responseTimeMs: 321,
      tokenCount: 42,
    });

    const ctx = await createTRPCContext({
      headers: new Headers({
        authorization: "Bearer valid-token",
      }),
    });
    const caller = createCaller(ctx);

    await expect(
      caller.provider.listTextModels({ provider: "openai" }),
    ).resolves.toEqual({
      provider: "openai",
      models: ["gpt-4o", "gpt-4o-mini"],
    });

    await expect(
      caller.provider.streamText({
        provider: "openai",
        model: "gpt-4o",
        prompt: "Say hello",
        temperature: 0.2,
      }),
    ).resolves.toEqual({
      provider: "openai",
      model: "gpt-4o",
      response: "hello from provider",
      responseTimeMs: 321,
      tokenCount: 42,
    });

    expect(listProviderTextModelsMock).toHaveBeenCalledWith("openai");
    expect(streamProviderResponseMock).toHaveBeenCalledWith({
      provider: "openai",
      model: "gpt-4o",
      prompt: "Say hello",
      temperature: 0.2,
    });
  });
});
