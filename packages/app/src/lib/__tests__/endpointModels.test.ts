import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderRegistry } from "@ensemble-ai/shared-utils/providers";
import { endpointModelName, fetchEndpointModels } from "../endpointModels";

const endpoints = [
  { id: "ollama", label: "Ollama" },
  { id: "openrouter", label: "OpenRouter" },
];

describe("endpointModelName", () => {
  it("names a model by its bare id and endpoint label", () => {
    expect(endpointModelName("ollama/llama3.2:3b", endpoints)).toBe(
      "llama3.2:3b (Ollama)",
    );
    expect(
      endpointModelName("openrouter/meta-llama/llama-3.1-8b", endpoints),
    ).toBe("meta-llama/llama-3.1-8b (OpenRouter)");
  });

  it("falls back to the preset label, then the id", () => {
    expect(endpointModelName("groq-2/llama", [])).toBe("llama (Groq)");
    expect(endpointModelName("plain", [])).toBe("plain");
  });
});

describe("fetchEndpointModels", () => {
  const original = process.env.NEXT_PUBLIC_MOCK_MODE;
  beforeEach(() => ProviderRegistry.getInstance().clearAll());
  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_MODE = original;
    ProviderRegistry.getInstance().clearAll();
  });

  it("lists the live models of connected endpoints", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    ProviderRegistry.getInstance().register("openai-compatible", "free", {
      listAvailableTextModels: vi.fn().mockResolvedValue(["ollama/qwen2.5:7b"]),
    } as never);
    expect(await fetchEndpointModels(endpoints)).toEqual([
      {
        id: "ollama/qwen2.5:7b",
        name: "qwen2.5:7b (Ollama)",
        provider: "openai-compatible",
        modalities: ["text"],
      },
    ]);
  });

  it("offers the mock models on every endpoint in mock mode", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "true";
    const models = await fetchEndpointModels([
      { id: "lmstudio", label: "LM Studio" },
    ]);
    expect(models.map((m) => m.id)).toEqual([
      "lmstudio/llama3.2:3b",
      "lmstudio/qwen2.5:7b",
      "lmstudio/gemma3:4b",
    ]);
    expect(models[0]?.name).toBe("llama3.2:3b (LM Studio)");
  });

  it("returns nothing without endpoints", async () => {
    expect(await fetchEndpointModels([])).toEqual([]);
  });
});
