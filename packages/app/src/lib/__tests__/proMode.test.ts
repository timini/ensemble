import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRO_STATUSES,
  isProPriced,
  proRunInput,
  resolveClientMode,
  workspaceEmbeddingsProvider,
} from "../proMode";

describe("Pro mode helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the Pro client in Pro mode, even in mock mode", () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODE", "true");
    expect(resolveClientMode("pro")).toBe("pro");
    expect(resolveClientMode("free")).toBe("mock");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODE", "false");
    expect(resolveClientMode("free")).toBe("free");
  });

  it("treats every hosted provider as ready in Pro", () => {
    expect(Object.values(PRO_STATUSES).every((s) => s === "valid")).toBe(true);
    expect(Object.keys(PRO_STATUSES)).toHaveLength(6);
  });

  it("embeds with OpenAI or Google in Pro whatever keys are stored", () => {
    expect(
      workspaceEmbeddingsProvider({
        mode: "pro",
        preference: "auto",
        apiKeys: {},
        endpoints: [],
      }),
    ).toBe("openai");
    expect(
      workspaceEmbeddingsProvider({
        mode: "pro",
        preference: "google",
        apiKeys: {},
        endpoints: [],
      }),
    ).toBe("google");
    expect(
      workspaceEmbeddingsProvider({
        mode: "free",
        preference: "auto",
        apiKeys: {},
        endpoints: [],
      }),
    ).toBeNull();
  });

  it("offers only models Pro can price", () => {
    expect(isProPriced("openai", "text-embedding-3-small")).toBe(true);
    expect(isProPriced("openai", "no-such-model")).toBe(false);
    expect(isProPriced("openai-compatible", "ollama/llama3")).toBe(false);
  });

  it("describes the run for the server's estimate", () => {
    const input = proRunInput(
      {
        selectedModels: [{ id: "a", provider: "openai", model: "gpt-5-mini" }],
        manualResponses: [],
        consensusMethod: "standard",
        summarizerModel: null,
        eloTopN: 3,
        embeddingsProvider: "auto",
      },
      "What is 2 + 2?",
    );
    expect(input).toEqual({
      models: [{ provider: "openai", modelId: "gpt-5-mini" }],
      manualResponseCount: 0,
      consensusMethod: "standard",
      summarizer: null,
      eloTopN: 3,
      embeddings: { provider: "openai", modelId: "text-embedding-3-small" },
      promptTokens: 4,
    });
  });
});
