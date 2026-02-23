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
    (
      input: {
        provider: string;
        model: string;
        prompt: string;
        temperature?: number;
      },
      options?: { onChunk?: (chunk: string) => void },
    ) => Promise<{ response: string; responseTimeMs: number; tokenCount?: number }>
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

interface TestSubscription<T> {
  subscribe: (handlers: {
    next: (value: T) => void;
    error: (error: unknown) => void;
    complete: () => void;
  }) => { unsubscribe: () => void };
}

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

  it("blocks unauthenticated streamTextEvents subscription and does not call provider service", async () => {
    const ctx = await createTRPCContext({ headers: new Headers() });
    const caller = createCaller(ctx);

    await expect(
      caller.provider.streamTextEvents({
        provider: "openai",
        model: "gpt-4o",
        prompt: "test",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
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

  it("emits chunk and complete events for authenticated streamTextEvents subscription", async () => {
    verifyFirebaseAuthTokenMock.mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
    });
    streamProviderResponseMock.mockImplementationOnce(
      async (_input, options) => {
        options?.onChunk?.("chunk-1");
        options?.onChunk?.("chunk-2");
        return {
          response: "chunk-1chunk-2",
          responseTimeMs: 222,
          tokenCount: 7,
        };
      },
    );

    const ctx = await createTRPCContext({
      headers: new Headers({
        authorization: "Bearer valid-token",
      }),
    });
    const caller = createCaller(ctx);

    const stream = await caller.provider.streamTextEvents({
      provider: "openai",
      model: "gpt-4o",
      prompt: "test",
    });

    const events: Array<Record<string, unknown>> = [];
    await new Promise<void>((resolve, reject) => {
      (stream as unknown as TestSubscription<Record<string, unknown>>).subscribe({
        next: (event) => events.push(event),
        error: (error) => {
          reject(
            error instanceof Error
              ? error
              : new Error(`Subscription error: ${String(error)}`),
          );
        },
        complete: () => resolve(),
      });
    });

    expect(events).toEqual([
      { type: "chunk", chunk: "chunk-1" },
      { type: "chunk", chunk: "chunk-2" },
      {
        type: "complete",
        response: "chunk-1chunk-2",
        responseTimeMs: 222,
        tokenCount: 7,
      },
    ]);
  });

  it("supports unsubscribe cleanup for streamTextEvents subscription", async () => {
    verifyFirebaseAuthTokenMock.mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
    });
    streamProviderResponseMock.mockImplementationOnce(async (_input, options) => {
      options?.onChunk?.("first");
      await new Promise((resolve) => setTimeout(resolve, 25));
      options?.onChunk?.("second");
      return {
        response: "firstsecond",
        responseTimeMs: 111,
        tokenCount: 2,
      };
    });

    const ctx = await createTRPCContext({
      headers: new Headers({
        authorization: "Bearer valid-token",
      }),
    });
    const caller = createCaller(ctx);
    const stream = await caller.provider.streamTextEvents({
      provider: "openai",
      model: "gpt-4o",
      prompt: "test",
    });

    const events: Array<Record<string, unknown>> = [];
    const onError = vi.fn();
    const onComplete = vi.fn();
    const subscription = (
      stream as unknown as TestSubscription<Record<string, unknown>>
    ).subscribe({
      next: (event) => events.push(event),
      error: onError,
      complete: onComplete,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    subscription.unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(events).toEqual([{ type: "chunk", chunk: "first" }]);
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
