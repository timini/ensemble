import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/auth/firebaseConfig", () => ({
  firebaseClientConfig: vi.fn(),
}));

import { firebaseClientConfig } from "~/lib/auth/firebaseConfig";
import { isProEnabled } from "../proEnabled";

const config = vi.mocked(firebaseClientConfig);

describe("isProEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    config.mockReset();
  });

  it("is off when the deployment has not opted in", () => {
    config.mockReturnValue({} as never);
    vi.stubEnv("NEXT_PUBLIC_PRO_ENABLED", "");
    expect(isProEnabled()).toBe(false);
  });

  it("is off without sign-in, even when opted in", () => {
    config.mockReturnValue(null);
    vi.stubEnv("NEXT_PUBLIC_PRO_ENABLED", "true");
    expect(isProEnabled()).toBe(false);
  });

  it("is on with sign-in and the opt-in", () => {
    config.mockReturnValue({} as never);
    vi.stubEnv("NEXT_PUBLIC_PRO_ENABLED", "true");
    expect(isProEnabled()).toBe(true);
  });
});
