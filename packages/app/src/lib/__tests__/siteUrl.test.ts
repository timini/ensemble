import { describe, expect, it } from "vitest";
import { LOCAL_SITE_URL, siteUrl } from "../siteUrl";

describe("siteUrl", () => {
  it("uses the origin of APP_URL", () => {
    expect(siteUrl({ APP_URL: "https://ensemble.example.com/" })).toBe(
      "https://ensemble.example.com",
    );
    expect(siteUrl({ APP_URL: "https://ensemble.example.com/path" })).toBe(
      "https://ensemble.example.com",
    );
  });

  it("falls back to localhost when APP_URL is unset or invalid", () => {
    expect(siteUrl({})).toBe(LOCAL_SITE_URL);
    expect(siteUrl({ APP_URL: "not a url" })).toBe(LOCAL_SITE_URL);
  });
});
