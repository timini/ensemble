import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => {
  const currentUser = { getIdToken: vi.fn(async () => "id-token") };
  const auth = { currentUser: null as typeof currentUser | null };
  return {
    currentUser,
    auth,
    initializeApp: vi.fn(() => ({ name: "ensemble-auth" })),
    getApps: vi.fn(() => [] as { name: string }[]),
    getAuth: vi.fn(() => auth),
    connectAuthEmulator: vi.fn(),
    onAuthStateChanged: vi.fn(),
    signInWithPopup: vi.fn(async () => undefined),
    GoogleAuthProvider: vi.fn(),
    sendSignInLinkToEmail: vi.fn(async () => undefined),
    isSignInWithEmailLink: vi.fn(() => true),
    signInWithEmailLink: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
  };
});

vi.mock("firebase/app", () => ({
  initializeApp: sdk.initializeApp,
  getApps: sdk.getApps,
}));
vi.mock("firebase/auth", () => sdk);

import { loadAuthClient, resetAuthClientForTests } from "../firebaseClient";

const config = {
  options: { apiKey: "k", authDomain: "d", projectId: "p" },
  emulatorHost: null,
};

describe("loadAuthClient", () => {
  beforeEach(() => {
    resetAuthClientForTests();
    sdk.auth.currentUser = null;
  });

  it("creates the Firebase app once and reuses it", async () => {
    const a = await loadAuthClient(config);
    const b = await loadAuthClient(config);
    expect(a).toBe(b);
    expect(sdk.initializeApp).toHaveBeenCalledWith(
      config.options,
      "ensemble-auth",
    );
    expect(sdk.connectAuthEmulator).not.toHaveBeenCalled();
  });

  it("connects to the Auth emulator when the flag is set", async () => {
    await loadAuthClient({ ...config, emulatorHost: "127.0.0.1:9099" });
    expect(sdk.connectAuthEmulator).toHaveBeenCalledWith(
      sdk.auth,
      "http://127.0.0.1:9099",
      {
        disableWarnings: true,
      },
    );
  });

  it("maps the Firebase user and forwards the sign-in calls", async () => {
    const client = await loadAuthClient(config);
    const seen: unknown[] = [];
    sdk.onAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (u: unknown) => void) => {
        cb({ uid: "u1", displayName: "Ada", email: "a@x.io", photoURL: null });
        cb(null);
        return () => undefined;
      },
    );
    client.onUserChanged((u) => seen.push(u));
    expect(seen).toEqual([
      { uid: "u1", name: "Ada", email: "a@x.io", photoURL: null },
      null,
    ]);

    expect(await client.getIdToken()).toBeNull();
    sdk.auth.currentUser = sdk.currentUser;
    expect(await client.getIdToken()).toBe("id-token");

    await client.signInWithGoogle();
    expect(sdk.signInWithPopup).toHaveBeenCalled();
    await client.sendEmailLink("a@x.io", "https://e.test/workspace");
    expect(sdk.sendSignInLinkToEmail).toHaveBeenCalledWith(sdk.auth, "a@x.io", {
      url: "https://e.test/workspace",
      handleCodeInApp: true,
    });
    expect(client.isEmailLink("https://e.test/?oobCode=1")).toBe(true);
    await client.completeEmailLink("a@x.io", "https://e.test/?oobCode=1");
    expect(sdk.signInWithEmailLink).toHaveBeenCalledWith(
      sdk.auth,
      "a@x.io",
      "https://e.test/?oobCode=1",
    );
    await client.signOut();
    expect(sdk.signOut).toHaveBeenCalledWith(sdk.auth);
  });
});
