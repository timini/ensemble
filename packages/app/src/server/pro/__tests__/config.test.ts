import { describe, expect, it } from "vitest";
import { DEFAULT_PRO_CONFIG, readProConfig } from "../config";

describe("readProConfig", () => {
  it("uses the documented defaults", () => {
    expect(readProConfig({})).toEqual(DEFAULT_PRO_CONFIG);
    expect(DEFAULT_PRO_CONFIG).toMatchObject({
      openRouterApiKey: undefined,
      openRouterBaseURL: "https://openrouter.ai/api/v1",
      maxRunTokens: 200_000,
      maxCallOutputTokens: 8_192,
      maxCallsPerRun: 150,
      rateLimitRuns: 10,
      rateLimitWindowSeconds: 60,
      staleRunMinutes: 30,
      mockUpstream: false,
      appCheckEnforce: false,
    });
  });

  it("reads every setting", () => {
    const config = readProConfig({
      OPENROUTER_API_KEY: "sk-or-v1-x",
      OPENROUTER_BASE_URL: "http://localhost:9999/v1",
      PRO_MAX_RUN_TOKENS: "50000",
      PRO_MAX_CALL_OUTPUT_TOKENS: "1000",
      PRO_MAX_CALLS_PER_RUN: "20",
      PRO_RATE_LIMIT_RUNS: "3",
      PRO_RATE_LIMIT_WINDOW_SECONDS: "120",
      PRO_MOCK_UPSTREAM: "true",
      APP_CHECK_ENFORCE: "true",
    });
    expect(config).toMatchObject({
      openRouterApiKey: "sk-or-v1-x",
      openRouterBaseURL: "http://localhost:9999/v1",
      maxRunTokens: 50_000,
      maxCallOutputTokens: 1000,
      maxCallsPerRun: 20,
      rateLimitRuns: 3,
      rateLimitWindowSeconds: 120,
      mockUpstream: true,
      appCheckEnforce: true,
    });
  });

  it("turns on the mock upstream in mock mode", () => {
    expect(readProConfig({ NEXT_PUBLIC_MOCK_MODE: "true" }).mockUpstream).toBe(
      true,
    );
  });

  it("refuses a limit that is not a positive whole number", () => {
    expect(() => readProConfig({ PRO_MAX_RUN_TOKENS: "0" })).toThrow(
      /PRO_MAX_RUN_TOKENS/,
    );
    expect(() => readProConfig({ PRO_RATE_LIMIT_RUNS: "abc" })).toThrow(
      /PRO_RATE_LIMIT_RUNS/,
    );
  });
});
