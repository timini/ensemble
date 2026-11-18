import { describe, expect, it } from "vitest";
import { scrubSentryEvent, tracesSampleRate } from "../sentryScrub";

describe("scrubSentryEvent", () => {
  it("drops tokens, cookies, bodies and query strings", () => {
    const event = scrubSentryEvent({
      request: {
        headers: {
          Authorization: "Bearer id-token",
          "x-firebase-appcheck": "app-check",
          "stripe-signature": "t=1,v1=x",
          cookie: "a=b",
          "user-agent": "test",
        },
        cookies: { a: "b" },
        data: '{"prompt":"private question"}',
        query_string: "key=AIza",
      },
      breadcrumbs: [
        { data: { url: "https://api.example/v1?key=AIza-secret" } },
      ],
    });
    expect(event.request).toEqual({ headers: { "user-agent": "test" } });
    expect(event.breadcrumbs[0]!.data.url).toBe("https://api.example/v1");
    expect(JSON.stringify(event)).not.toMatch(
      /id-token|app-check|private question|AIza/,
    );
  });

  it("leaves events without a request alone", () => {
    expect(scrubSentryEvent({})).toEqual({});
  });
});

describe("tracesSampleRate", () => {
  it("reads the configured rate and falls back by environment", () => {
    expect(tracesSampleRate({ rate: "0.25", nodeEnv: "production" })).toBe(
      0.25,
    );
    expect(tracesSampleRate({ rate: "7", nodeEnv: "production" })).toBe(0.1);
    expect(tracesSampleRate({ nodeEnv: "production" })).toBe(0.1);
    expect(tracesSampleRate({ nodeEnv: "development" })).toBe(1);
  });
});
