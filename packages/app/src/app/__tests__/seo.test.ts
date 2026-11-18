// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "../robots";
import sitemap from "../sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt and sitemap.xml", () => {
  it("point at APP_URL", () => {
    vi.stubEnv("APP_URL", "https://ensemble.example.com");
    expect(robots()).toMatchObject({
      sitemap: "https://ensemble.example.com/sitemap.xml",
      host: "https://ensemble.example.com",
    });
    expect(sitemap().map((e) => e.url)).toEqual([
      "https://ensemble.example.com",
      "https://ensemble.example.com/features",
      "https://ensemble.example.com/about",
      "https://ensemble.example.com/benchmarks",
    ]);
  });

  it("keep the API out and shared runs crawlable for previews", () => {
    const rules = robots().rules as { disallow: string[] };
    expect(rules.disallow).toContain("/api/");
    expect(rules.disallow).not.toContain("/s/");
  });
});
