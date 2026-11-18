import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFirebaseClientConfig } from "../firebaseConfig";
import { toSignInError } from "../authErrors";
import {
  emailLinkContinueUrl,
  forgetEmailForSignIn,
  recallEmailForSignIn,
  rememberEmailForSignIn,
  withoutEmailLinkParams,
} from "../emailLink";
import { getIdToken, setIdTokenGetter } from "../idToken";

describe("readFirebaseClientConfig", () => {
  it("is null without config, so Free mode runs with sign-in unavailable", () => {
    expect(readFirebaseClientConfig({})).toBeNull();
    expect(
      readFirebaseClientConfig({ NEXT_PUBLIC_FIREBASE_API_KEY: "k" }),
    ).toBeNull();
  });

  it("reads the web config", () => {
    expect(
      readFirebaseClientConfig({
        NEXT_PUBLIC_FIREBASE_API_KEY: "key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "x.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "x",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:2:web:3",
      }),
    ).toEqual({
      options: {
        apiKey: "key",
        authDomain: "x.firebaseapp.com",
        projectId: "x",
        appId: "1:2:web:3",
      },
      emulatorHost: null,
    });
  });

  it("uses a demo project for the Auth emulator when no config is set", () => {
    expect(
      readFirebaseClientConfig({
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).toEqual({
      options: {
        apiKey: "demo-api-key",
        authDomain: "localhost",
        projectId: "demo-ensemble",
      },
      emulatorHost: "127.0.0.1:9099",
    });
  });
});

describe("toSignInError", () => {
  it("maps Firebase error codes to the panel's messages", () => {
    expect(toSignInError({ code: "auth/popup-closed-by-user" })).toBe(
      "popupClosed",
    );
    expect(toSignInError({ code: "auth/cancelled-popup-request" })).toBe(
      "popupClosed",
    );
    expect(toSignInError({ code: "auth/invalid-email" })).toBe("invalidEmail");
    expect(toSignInError({ code: "auth/network-request-failed" })).toBe(
      "network",
    );
    expect(toSignInError({ code: "auth/invalid-action-code" })).toBe(
      "expiredLink",
    );
    expect(toSignInError({ code: "auth/expired-action-code" })).toBe(
      "expiredLink",
    );
    expect(toSignInError(new Error("boom"))).toBe("generic");
    expect(toSignInError(null)).toBe("generic");
  });
});

describe("email link helpers", () => {
  // Node 22+ has its own localStorage global, which can hide jsdom's.
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

  it("remembers the address the link was sent to", () => {
    expect(recallEmailForSignIn()).toBeNull();
    rememberEmailForSignIn("ada@example.com");
    expect(recallEmailForSignIn()).toBe("ada@example.com");
    forgetEmailForSignIn();
    expect(recallEmailForSignIn()).toBeNull();
  });

  it("sends the link back to the workspace", () => {
    expect(emailLinkContinueUrl("https://ensemble.test")).toBe(
      "https://ensemble.test/workspace",
    );
    expect(emailLinkContinueUrl("https://ensemble.test", "/landing")).toBe(
      "https://ensemble.test/workspace",
    );
  });

  it("sends a link asked for on the account page back there", () => {
    expect(emailLinkContinueUrl("https://ensemble.test/", "/account")).toBe(
      "https://ensemble.test/account",
    );
  });

  it("strips the one-time sign-in parameters from the address bar", () => {
    expect(
      withoutEmailLinkParams(
        "https://ensemble.test/workspace?apiKey=k&oobCode=c&mode=signIn&lang=en&continueUrl=x&panel=settings",
      ),
    ).toBe("https://ensemble.test/workspace?panel=settings");
    expect(
      withoutEmailLinkParams("https://ensemble.test/workspace?oobCode=c"),
    ).toBe("https://ensemble.test/workspace");
  });
});

describe("idToken", () => {
  afterEach(() => setIdTokenGetter(null));

  it("is null until a signed-in session provides a token", async () => {
    expect(await getIdToken()).toBeNull();
    setIdTokenGetter(async () => "token-1");
    expect(await getIdToken()).toBe("token-1");
  });

  it("swallows token refresh failures so requests go out unauthenticated", async () => {
    setIdTokenGetter(async () => {
      throw new Error("offline");
    });
    expect(await getIdToken()).toBeNull();
  });
});
