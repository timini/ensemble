import { describe, expect, it } from "vitest";
import {
  canEmbedWithEndpoints,
  embeddingStatuses,
  endpointsProviderStatus,
  endpointEmbeddingModelRef,
} from "../endpointStatus";
import type { EndpointEntry } from "~/store/slices/endpointsSlice";

function endpoint(patch: Partial<EndpointEntry>): EndpointEntry {
  return {
    id: "ollama",
    presetId: "ollama",
    label: "Ollama",
    baseURL: "http://localhost:11434/v1",
    apiKey: "",
    encryptedApiKey: null,
    embeddingModel: "",
    status: "idle",
    embeddingModelFound: true,
    ...patch,
  };
}

describe("endpointsProviderStatus", () => {
  it("is valid when any endpoint is connected", () => {
    expect(
      endpointsProviderStatus([
        endpoint({ status: "invalid" }),
        endpoint({ id: "b", status: "valid" }),
      ]),
    ).toBe("valid");
  });

  it("is validating, then invalid, then idle", () => {
    expect(
      endpointsProviderStatus([
        endpoint({ status: "validating" }),
        endpoint({ status: "invalid" }),
      ]),
    ).toBe("validating");
    expect(endpointsProviderStatus([endpoint({ status: "invalid" })])).toBe(
      "invalid",
    );
    expect(endpointsProviderStatus([])).toBe("idle");
  });
});

describe("embeddings from endpoints", () => {
  it("needs the check to have found the embedding model on the server", () => {
    expect(
      canEmbedWithEndpoints([
        endpoint({
          status: "valid",
          embeddingModel: "nomic-embed-text",
          embeddingModelFound: false,
        }),
      ]),
    ).toBe(false);
    expect(
      canEmbedWithEndpoints([
        endpoint({ status: "valid", embeddingModel: "nomic-embed-text", embeddingModelFound: undefined }),
      ]),
    ).toBe(false);
  });

  it("needs a connected endpoint with an embedding model", () => {
    expect(canEmbedWithEndpoints([endpoint({ status: "valid" })])).toBe(false);
    expect(
      canEmbedWithEndpoints([
        endpoint({ status: "invalid", embeddingModel: "nomic-embed-text" }),
      ]),
    ).toBe(false);
    expect(
      canEmbedWithEndpoints([
        endpoint({ status: "valid", embeddingModel: "nomic-embed-text" }),
      ]),
    ).toBe(true);
  });

  it("adds openai-compatible to the key statuses", () => {
    const statuses = embeddingStatuses(
      { openai: { status: "invalid" }, google: null },
      [endpoint({ status: "valid", embeddingModel: "nomic-embed-text" })],
    );
    expect(statuses).toEqual({
      openai: "invalid",
      google: "idle",
      "openai-compatible": "valid",
    });
  });

  it("names the embedding model with its endpoint for pricing", () => {
    expect(
      endpointEmbeddingModelRef([
        endpoint({ id: "groq", status: "valid" }),
        endpoint({ status: "valid", embeddingModel: "nomic-embed-text" }),
      ]),
    ).toEqual({
      provider: "openai-compatible",
      modelId: "ollama/nomic-embed-text",
    });
    expect(endpointEmbeddingModelRef([])).toBeNull();
  });
});
