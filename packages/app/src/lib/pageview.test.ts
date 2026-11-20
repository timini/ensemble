import { describe, expect, it, vi, afterEach } from "vitest";
import {
  analyticsAllowed,
  analyticsPath,
  pageviewParameters,
} from "./pageview";

describe("basic pageview privacy", () => {
  it("omits arbitrary paths and URL details", () => {
    expect(
      analyticsPath("/private/person@example.com?token=secret#answer"),
    ).toBe("/other");
    expect(pageviewParameters("/", "https://example.com")).toEqual({
      page_location: "https://example.com/",
      page_path: "/",
      page_title: "ensemble",
      page_referrer: "",
    });
  });
  it("does not include content identifiers", () => {
    const path = analyticsPath("/s/private-id");
    expect(path).not.toContain("private");
    expect(path).toBe("/s/[id]");
  });
});

describe("pageview transport", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses denied consent before loading, sanitizes events and deduplicates effects", async () => {
    vi.resetModules();
    const scripts: unknown[] = [];
    const fakeWindow = {
      location: {
        protocol: "https:",
        origin: "https://ensemble-app--ensemble-ai-prod.us-central1.hosted.app",
        hostname: "ensemble-app--ensemble-ai-prod.us-central1.hosted.app",
      },
      dataLayer: [] as IArguments[],
    };
    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", {
      createElement: () => ({}),
      head: { appendChild: (script: unknown) => scripts.push(script) },
    });
    const { trackPageview } = await import("./pageview");
    trackPageview("/", "invalid");
    expect(scripts).toHaveLength(0);
    trackPageview("/", "G-EXAMPLE", "nonce-test");
    trackPageview("/", "G-EXAMPLE", "nonce-test");
    trackPageview(
      "/secret?email=x@example.com#prompt",
      "G-EXAMPLE",
      "nonce-test",
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({ nonce: "nonce-test", async: true });
    const commands = fakeWindow.dataLayer.map(
      (args) => Array.from(args) as unknown[],
    );
    expect(commands[0]).toEqual([
      "consent",
      "default",
      {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    ]);
    expect(commands.filter(([type]) => type === "event")).toHaveLength(2);
    expect(commands.find(([type]) => type === "config")?.[2]).toMatchObject({
      send_page_view: false,
      allow_google_signals: false,
    });
    expect(JSON.stringify(commands)).not.toMatch(
      /secret|email|prompt|example.com#/,
    );
  });
  it("does not load on an insecure local preview", async () => {
    vi.resetModules();
    vi.stubGlobal("window", { location: { protocol: "http:" } });
    const { trackPageview } = await import("./pageview");
    expect(() => trackPageview("/", "G-EXAMPLE")).not.toThrow();
  });
});

describe("production and browser privacy guard", () => {
  it("allows only the production host without an opt-out", () => {
    expect(
      analyticsAllowed(
        "ensemble-app--ensemble-ai-prod.us-central1.hosted.app",
        {},
      ),
    ).toBe(true);
    expect(analyticsAllowed("preview.example.com", {})).toBe(false);
    expect(analyticsAllowed("localhost", {})).toBe(false);
    expect(
      analyticsAllowed(
        "ensemble-app--ensemble-ai-prod.us-central1.hosted.app",
        { globalPrivacyControl: true },
      ),
    ).toBe(false);
    expect(
      analyticsAllowed(
        "ensemble-app--ensemble-ai-prod.us-central1.hosted.app",
        { doNotTrack: "1" },
      ),
    ).toBe(false);
    expect(
      analyticsAllowed(
        "ensemble-app--ensemble-ai-prod.us-central1.hosted.app",
        { doNotTrack: "yes" },
      ),
    ).toBe(false);
  });
});
