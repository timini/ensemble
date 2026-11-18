// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import { MockProviderClient } from "@ensemble-ai/shared-utils/providers";
import { DEFAULT_PRO_CONFIG } from "../config";
import {
  embeddingModelFor,
  ProUnavailableError,
  resolveProModel,
  UnpricedModelError,
} from "../models";
import { createUpstream } from "../upstream";

const TABLE: PriceTable = {
  source: "test",
  fetchedAt: "2026-11-01",
  models: {
    "anthropic/claude-opus-5-5": { inputPerMillion: 5, outputPerMillion: 25, openRouterId: "anthropic/claude-opus-5.5" },
    "openai/text-embedding-3-small": { inputPerMillion: 0.02, outputPerMillion: 0, openRouterId: "openai/text-embedding-3-small" },
  },
};

describe("Pro model ids", () => {
  it("maps our provider and model to the OpenRouter id from the price table", () => {
    expect(resolveProModel("anthropic", "claude-opus-5-5", TABLE)).toEqual({
      provider: "anthropic",
      modelId: "claude-opus-5-5",
      openRouterId: "anthropic/claude-opus-5.5",
    });
  });

  it("refuses a model with no price, since Pro could not bill it", () => {
    expect(() => resolveProModel("openai", "gpt-unknown", TABLE)).toThrow(UnpricedModelError);
    expect(() => resolveProModel("openai-compatible", "ollama/llama3", TABLE)).toThrow(UnpricedModelError);
  });

  it("names the embedding model of OpenAI and Google and refuses others", () => {
    expect(embeddingModelFor("openai", TABLE)).toEqual({
      provider: "openai",
      modelId: "text-embedding-3-small",
      openRouterId: "openai/text-embedding-3-small",
    });
    expect(() => embeddingModelFor("anthropic", TABLE)).toThrow(UnpricedModelError);
  });
});

describe("createUpstream", () => {
  it("calls OpenRouter with the server key and the OpenRouter model id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 }),
    );
    const upstream = createUpstream({ ...DEFAULT_PRO_CONFIG, openRouterApiKey: "sk-or-server" }, { fetchImpl });
    await upstream.client.generateStructured("Q", "anthropic/claude-opus-5.5", { name: "s", schema: {} });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-or-server");
    expect((JSON.parse(init.body as string) as { model: string }).model).toBe("anthropic/claude-opus-5.5");
    expect(upstream.mock).toBe(false);
  });

  it("uses the mock client in mock mode and never fetches", () => {
    const fetchImpl = vi.fn();
    const upstream = createUpstream({ ...DEFAULT_PRO_CONFIG, mockUpstream: true }, { fetchImpl });
    expect(upstream.client).toBeInstanceOf(MockProviderClient);
    expect(upstream.mock).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("is unavailable without a key outside mock mode", () => {
    expect(() => createUpstream(DEFAULT_PRO_CONFIG)).toThrow(ProUnavailableError);
  });
});
