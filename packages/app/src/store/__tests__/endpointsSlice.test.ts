import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  createEndpointsSlice,
  selectEndpointConfigs,
  sanitizeEndpointsForPersist,
  type EndpointsSlice,
} from "../slices/endpointsSlice";

vi.mock("@ensemble-ai/shared-utils/security", () => ({
  encrypt: vi.fn().mockImplementation(async (value: string) => `enc:${value}`),
  decrypt: vi.fn().mockImplementation(async (value: string) => {
    if (value === "enc:broken") throw new Error("bad");
    return value.replace(/^enc:/, "");
  }),
  isLegacyCiphertext: () => false,
  EncryptionKeyUnavailableError: class EncryptionKeyUnavailableError extends Error {},
}));

describe("endpointsSlice", () => {
  let store: StoreApi<EndpointsSlice>;

  beforeEach(() => {
    store = createStore<EndpointsSlice>()(createEndpointsSlice);
  });

  it("adds an endpoint from a preset with its base URL and embedding model", () => {
    const id = store.getState().addEndpoint("ollama");
    expect(id).toBe("ollama");
    expect(store.getState().endpoints[0]).toMatchObject({
      id: "ollama",
      presetId: "ollama",
      label: "Ollama",
      baseURL: "http://localhost:11434/v1",
      embeddingModel: "nomic-embed-text",
      apiKey: "",
      status: "idle",
    });
  });

  it("numbers further endpoints of the same preset", () => {
    store.getState().addEndpoint("ollama");
    expect(store.getState().addEndpoint("ollama")).toBe("ollama-2");
    expect(store.getState().endpoints.map((e) => e.label)).toEqual([
      "Ollama",
      "Ollama 2",
    ]);
  });

  it("resets the status when the base URL changes", () => {
    store.getState().addEndpoint("custom");
    store.getState().setEndpointStatus("custom", "valid", { modelCount: 2 });
    store
      .getState()
      .updateEndpoint("custom", { baseURL: "http://localhost:9000/v1" });
    expect(store.getState().endpoints[0]).toMatchObject({
      baseURL: "http://localhost:9000/v1",
      status: "idle",
    });
    expect(store.getState().endpoints[0]?.modelCount).toBeUndefined();
  });

  it("keeps the status when only the embedding model changes", () => {
    store.getState().addEndpoint("ollama");
    store.getState().setEndpointStatus("ollama", "valid", { modelCount: 2 });
    store
      .getState()
      .updateEndpoint("ollama", { embeddingModel: "mxbai-embed-large" });
    expect(store.getState().endpoints[0]).toMatchObject({
      embeddingModel: "mxbai-embed-large",
      status: "valid",
    });
  });

  it("encrypts the key and resets the status", async () => {
    store.getState().addEndpoint("openrouter");
    await store.getState().setEndpointApiKey("openrouter", "  sk-or  ");
    expect(store.getState().endpoints[0]).toMatchObject({
      apiKey: "sk-or",
      encryptedApiKey: "enc:sk-or",
      status: "idle",
    });
    await store.getState().setEndpointApiKey("openrouter", "");
    expect(store.getState().endpoints[0]).toMatchObject({
      apiKey: "",
      encryptedApiKey: null,
    });
  });

  it("removes an endpoint", () => {
    store.getState().addEndpoint("ollama");
    store.getState().addEndpoint("groq");
    store.getState().removeEndpoint("ollama");
    expect(store.getState().endpoints.map((e) => e.id)).toEqual(["groq"]);
  });

  it("decrypts stored keys and drops keys it cannot decrypt", async () => {
    store.setState({
      endpoints: [
        {
          ...store.getState().endpoints[0],
          id: "a",
          presetId: "custom",
          label: "A",
          baseURL: "x",
          embeddingModel: "",
          apiKey: "",
          encryptedApiKey: "enc:k1",
          status: "valid",
        },
        {
          id: "b",
          presetId: "custom",
          label: "B",
          baseURL: "y",
          embeddingModel: "",
          apiKey: "",
          encryptedApiKey: "enc:broken",
          status: "valid",
        },
      ],
    });
    await store.getState().initializeEndpointKeys();
    const [a, b] = store.getState().endpoints;
    expect(a).toMatchObject({ apiKey: "k1", encryptedApiKey: "enc:k1" });
    expect(b).toMatchObject({
      apiKey: "",
      encryptedApiKey: null,
      status: "idle",
    });
  });

  it("strips plaintext keys before persisting", () => {
    store.getState().addEndpoint("groq");
    store.setState({
      endpoints: store.getState().endpoints.map((e) => ({
        ...e,
        apiKey: "gsk",
        encryptedApiKey: "enc:gsk",
      })),
    });
    const persisted = sanitizeEndpointsForPersist(store.getState().endpoints);
    expect(persisted[0]).toMatchObject({
      apiKey: "",
      encryptedApiKey: "enc:gsk",
    });
  });

  it("gives the client only connected endpoints, with their keys", () => {
    store.getState().addEndpoint("ollama");
    store.getState().addEndpoint("groq");
    store.getState().setEndpointStatus("ollama", "valid", {
      modelCount: 1,
      embeddingModelFound: true,
    });
    expect(selectEndpointConfigs(store.getState())).toEqual([
      {
        id: "ollama",
        baseURL: "http://localhost:11434/v1",
        apiKey: "",
        embeddingModel: "nomic-embed-text",
      },
    ]);
  });

  it("withholds an embedding model the server does not list", () => {
    store.getState().addEndpoint("ollama");
    store.getState().setEndpointStatus("ollama", "valid", {
      modelCount: 1,
      embeddingModelFound: false,
    });
    expect(selectEndpointConfigs(store.getState())[0]?.embeddingModel).toBe("");
  });

  it("forgets whether the embedding model was found when it changes", () => {
    store.getState().addEndpoint("ollama");
    store.getState().setEndpointStatus("ollama", "valid", {
      embeddingModelFound: true,
    });
    store.getState().updateEndpoint("ollama", { embeddingModel: "other" });
    expect(store.getState().endpoints[0]).toMatchObject({
      status: "valid",
      embeddingModelFound: undefined,
    });
  });

  it("adds an endpoint with a found base URL and embedding model", () => {
    store.getState().addEndpoint("ollama", {
      baseURL: "http://127.0.0.1:11434/v1",
      embeddingModel: "embeddinggemma:latest",
    });
    expect(store.getState().endpoints[0]).toMatchObject({
      id: "ollama",
      baseURL: "http://127.0.0.1:11434/v1",
      embeddingModel: "embeddinggemma:latest",
      status: "idle",
    });
  });

  it("remembers that the Ollama offer was dismissed", () => {
    expect(store.getState().ollamaOfferDismissed).toBe(false);
    store.getState().dismissOllamaOffer();
    expect(store.getState().ollamaOfferDismissed).toBe(true);
  });
});
