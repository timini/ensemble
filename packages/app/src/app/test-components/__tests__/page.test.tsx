import { afterEach, describe, expect, it, vi } from "vitest";

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

import TestComponentsPage from "../page";
import { isTestComponentsPageEnabled } from "../isTestComponentsPageEnabled";

describe("isTestComponentsPageEnabled", () => {
  it("is enabled outside production", () => {
    expect(isTestComponentsPageEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isTestComponentsPageEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("is disabled in production by default", () => {
    expect(isTestComponentsPageEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isTestComponentsPageEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_MOCK_MODE: "false",
      }),
    ).toBe(false);
  });

  it("is enabled in production when mock mode is on", () => {
    expect(
      isTestComponentsPageEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_MOCK_MODE: "true",
      }),
    ).toBe(true);
  });
});

describe("TestComponentsPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    notFoundMock.mockClear();
  });

  it("calls notFound in production without mock mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODE", "false");
    expect(() => TestComponentsPage()).toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders the gallery in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(TestComponentsPage()).toBeTruthy();
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
