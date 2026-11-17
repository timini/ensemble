import { describe, expect, it } from "vitest";
import { detectKeyProvider } from "../keyProvider";

describe("detectKeyProvider", () => {
  it.each([
    ["sk-or-v1-abc", "openrouter"],
    ["sk-ant-api03-abc", "anthropic"],
    ["AIzaSyAbc", "google"],
    ["xai-abc", "xai"],
    ["pplx-abc", "perplexity"],
    ["sk-proj-abc", "openai"],
    ["sk-svcacct-abc", "openai"],
  ] as const)("recognises %s as %s", (key, provider) => {
    expect(detectKeyProvider(key, "openrouter")).toBe(provider);
  });

  it("treats a plain sk- key as OpenAI unless DeepSeek is chosen, since both use it", () => {
    expect(detectKeyProvider("sk-abc123", "openrouter")).toBe("openai");
    expect(detectKeyProvider("sk-abc123", "deepseek")).toBe("deepseek");
    expect(detectKeyProvider("sk-abc123", "openai")).toBe("openai");
  });

  it("keeps the chosen provider when the key says nothing", () => {
    expect(detectKeyProvider("", "google")).toBe("google");
    expect(detectKeyProvider("abc", "xai")).toBe("xai");
    expect(detectKeyProvider("  sk-or-v1-x  ", "openai")).toBe("openrouter");
  });
});
