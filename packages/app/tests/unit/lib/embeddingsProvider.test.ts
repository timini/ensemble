import { describe, expect, it } from "vitest";
import {
  normalizeEmbeddingsPreference,
  resolveEmbeddingsProvider,
} from "~/lib/embeddingsProvider";

const statuses = (valid: string[]) =>
  ({
    openai: valid.includes("openai") ? "valid" : "idle",
    anthropic: valid.includes("anthropic") ? "valid" : "idle",
    google: valid.includes("google") ? "valid" : "invalid",
    xai: "idle",
    deepseek: "idle",
    perplexity: "idle",
  }) as const;

describe("resolveEmbeddingsProvider", () => {
  it("picks OpenAI first in auto mode", () => {
    expect(
      resolveEmbeddingsProvider({
        preference: "auto",
        statuses: statuses(["openai", "google"]),
      }),
    ).toBe("openai");
  });

  it("picks Google when only Google has a valid key", () => {
    expect(
      resolveEmbeddingsProvider({
        preference: "auto",
        statuses: statuses(["google", "anthropic"]),
      }),
    ).toBe("google");
  });

  it("honours the override when its key is valid", () => {
    expect(
      resolveEmbeddingsProvider({
        preference: "google",
        statuses: statuses(["openai", "google"]),
      }),
    ).toBe("google");
  });

  it("returns null when no embedding provider has a valid key", () => {
    expect(
      resolveEmbeddingsProvider({
        preference: "auto",
        statuses: statuses(["anthropic"]),
      }),
    ).toBeNull();
  });

  it("ignores the override when its key is not valid", () => {
    expect(
      resolveEmbeddingsProvider({
        preference: "google",
        statuses: statuses(["openai"]),
      }),
    ).toBe("openai");
  });
});

describe("normalizeEmbeddingsPreference", () => {
  it("keeps known values", () => {
    expect(normalizeEmbeddingsPreference("auto")).toBe("auto");
    expect(normalizeEmbeddingsPreference("openai")).toBe("openai");
    expect(normalizeEmbeddingsPreference("google")).toBe("google");
  });

  it("maps legacy or unknown values to auto", () => {
    expect(normalizeEmbeddingsPreference("anthropic")).toBe("auto");
    expect(normalizeEmbeddingsPreference(undefined)).toBe("auto");
  });
});
