import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "~/server/auth/firebaseAdmin";

const { verifyFirebaseAuthTokenMock } = vi.hoisted(() => ({
  verifyFirebaseAuthTokenMock: vi.fn<
    (token: string) => Promise<AuthUser | null>
  >(),
}));

vi.mock("~/server/auth/firebaseAdmin", () => ({
  verifyFirebaseAuthToken: verifyFirebaseAuthTokenMock,
}));

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

describe("tRPC auth protection", () => {
  beforeEach(() => {
    verifyFirebaseAuthTokenMock.mockReset();
  });

  it("does not verify bearer token for public procedures", async () => {
    const ctx = await createTRPCContext({
      headers: new Headers({
        authorization: "Bearer valid-token",
      }),
    });
    const caller = createCaller(ctx);

    await expect(caller.post.hello({ text: "world" })).resolves.toEqual({
      greeting: "Hello world",
    });
    expect(verifyFirebaseAuthTokenMock).not.toHaveBeenCalled();
  });

  it("rejects protected procedures when no auth header is provided", async () => {
    const ctx = await createTRPCContext({
      headers: new Headers(),
    });
    const caller = createCaller(ctx);

    await expect(caller.auth.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
    expect(verifyFirebaseAuthTokenMock).not.toHaveBeenCalled();
  });

  it("rejects protected procedures when bearer token is invalid", async () => {
    verifyFirebaseAuthTokenMock.mockResolvedValueOnce(null);

    const ctx = await createTRPCContext({
      headers: new Headers({
        authorization: "Bearer invalid-token",
      }),
    });
    const caller = createCaller(ctx);

    await expect(caller.auth.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
    expect(verifyFirebaseAuthTokenMock).toHaveBeenCalledWith("invalid-token");
    expect(verifyFirebaseAuthTokenMock).toHaveBeenCalledTimes(1);
  });

  it("allows protected procedures when bearer token is valid", async () => {
    verifyFirebaseAuthTokenMock.mockResolvedValueOnce({
      uid: "user-123",
      email: "test@example.com",
      name: "Test User",
      picture: "https://example.com/avatar.png",
    });

    const ctx = await createTRPCContext({
      headers: new Headers({
        authorization: "Bearer valid-token",
      }),
    });
    const caller = createCaller(ctx);

    await expect(caller.auth.me()).resolves.toEqual({
      uid: "user-123",
      email: "test@example.com",
      name: "Test User",
      picture: "https://example.com/avatar.png",
    });
    expect(verifyFirebaseAuthTokenMock).toHaveBeenCalledWith("valid-token");
    expect(verifyFirebaseAuthTokenMock).toHaveBeenCalledTimes(1);
  });
});
