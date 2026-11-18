import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient, SignedInUser } from "~/lib/auth/firebaseClient";
import { getIdToken } from "~/lib/auth/idToken";
import { useAuthController } from "../useAuthController";

const config = {
  options: { apiKey: "k", authDomain: "d", projectId: "p" },
  emulatorHost: null,
};
const ada: SignedInUser = {
  uid: "u1",
  name: "Ada",
  email: "ada@example.com",
  photoURL: null,
};

function fakeClient(overrides: Partial<AuthClient> = {}) {
  let emit: (user: SignedInUser | null) => void = () => undefined;
  const client: AuthClient = {
    onUserChanged: (cb) => {
      emit = cb;
      cb(null);
      return () => undefined;
    },
    getIdToken: vi.fn(async () => "token"),
    signInWithGoogle: vi.fn(async () => emit(ada)),
    sendEmailLink: vi.fn(async () => undefined),
    isEmailLink: vi.fn(() => false),
    completeEmailLink: vi.fn(async () => emit(ada)),
    signOut: vi.fn(async () => emit(null)),
    ...overrides,
  };
  return {
    client,
    load: vi.fn(async () => client),
    emit: (u: SignedInUser | null) => emit(u),
  };
}

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

describe("useAuthController", () => {
  it("reports sign-in as unavailable without a Firebase config", () => {
    const { result } = renderHook(() => useAuthController(null));
    expect(result.current.status).toBe("unavailable");
  });

  it("loads the session, then signs in with Google and exposes the ID token", async () => {
    const { client, load } = fakeClient();
    const { result } = renderHook(() => useAuthController(config, load));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    expect(await getIdToken()).toBeNull();

    await act(async () => result.current.signInWithGoogle());
    expect(client.signInWithGoogle).toHaveBeenCalled();
    expect(result.current.status).toBe("signedIn");
    expect(result.current.user?.email).toBe("ada@example.com");
    expect(await getIdToken()).toBe("token");

    await act(async () => result.current.signOut());
    expect(result.current.status).toBe("signedOut");
    expect(await getIdToken()).toBeNull();
  });

  it("shows a sign-in failure", async () => {
    const { load } = fakeClient({
      signInWithGoogle: vi.fn(async () => {
        throw Object.assign(new Error("closed"), {
          code: "auth/popup-closed-by-user",
        });
      }),
    });
    const { result } = renderHook(() => useAuthController(config, load));
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    await act(async () => result.current.signInWithGoogle());
    expect(result.current.error).toBe("popupClosed");
    expect(result.current.pending).toBe(false);
  });

  it("sends an email link and remembers the address on this device", async () => {
    const { client, load } = fakeClient();
    const { result } = renderHook(() => useAuthController(config, load));
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    await act(async () => result.current.submitEmail("ada@example.com"));
    expect(client.sendEmailLink).toHaveBeenCalledWith(
      "ada@example.com",
      `${window.location.origin}/workspace`,
    );
    expect(result.current.emailSentTo).toBe("ada@example.com");
    expect(stored.get("ensemble-email-for-sign-in")).toBe("ada@example.com");
  });

  it("finishes an email link opened on the same device", async () => {
    stored.set("ensemble-email-for-sign-in", "ada@example.com");
    const { client, load } = fakeClient({ isEmailLink: vi.fn(() => true) });
    const { result } = renderHook(() => useAuthController(config, load));
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(client.completeEmailLink).toHaveBeenCalledWith(
      "ada@example.com",
      window.location.href,
    );
    expect(stored.has("ensemble-email-for-sign-in")).toBe(false);
  });

  it("asks for the address to finish a link opened on another device", async () => {
    const { client, load } = fakeClient({ isEmailLink: vi.fn(() => true) });
    const { result } = renderHook(() => useAuthController(config, load));
    await waitFor(() => expect(result.current.confirmEmail).toBe(true));
    await act(async () => result.current.submitEmail("ada@example.com"));
    expect(client.completeEmailLink).toHaveBeenCalledWith(
      "ada@example.com",
      expect.any(String),
    );
    expect(client.sendEmailLink).not.toHaveBeenCalled();
    expect(result.current.confirmEmail).toBe(false);
    expect(result.current.status).toBe("signedIn");
  });

  it("falls back to unavailable when the SDK cannot load", async () => {
    const load = vi.fn(async () => {
      throw new Error("chunk failed");
    });
    const { result } = renderHook(() => useAuthController(config, load));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });
});
