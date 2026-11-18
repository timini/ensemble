import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAppCheckToken,
  readAppCheckConfig,
  setAppCheckTokenGetter,
} from "../appCheck";

describe("App Check on the client", () => {
  afterEach(() => setAppCheckTokenGetter(null));

  it("is off without a site key", () => {
    expect(readAppCheckConfig({})).toBeNull();
    expect(
      readAppCheckConfig({ NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: "" }),
    ).toBeNull();
  });

  it("reads the site key and an optional debug token", () => {
    expect(
      readAppCheckConfig({
        NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: "site",
        NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN: "debug",
      }),
    ).toEqual({ siteKey: "site", debugToken: "debug" });
  });

  it("gives no token until App Check starts, and null when the token fails", async () => {
    expect(await getAppCheckToken()).toBeNull();
    setAppCheckTokenGetter(async () => "tok");
    expect(await getAppCheckToken()).toBe("tok");
    setAppCheckTokenGetter(vi.fn().mockRejectedValue(new Error("throttled")));
    expect(await getAppCheckToken()).toBeNull();
  });
});
