import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "~/store";
import { checkEndpoint } from "~/lib/endpointValidation";
import { useEndpointConfiguration } from "../useEndpointConfiguration";

vi.mock("~/lib/endpointValidation", () => ({
  checkEndpoint: vi.fn(
    async (endpoint: { baseURL: string; embeddingModel: string }) =>
      endpoint.baseURL.includes("down")
        ? { status: "invalid", error: "Failed to fetch" }
        : endpoint.baseURL.includes("gemma")
          ? {
              status: "valid",
              modelCount: 2,
              embeddingModelFound: endpoint.embeddingModel === "embeddinggemma",
              ...(endpoint.embeddingModel === "embeddinggemma"
                ? {}
                : { suggestedEmbeddingModel: "embeddinggemma" }),
            }
          : {
              status: "valid",
              modelCount: 2,
              embeddingModelFound:
                endpoint.embeddingModel === "nomic-embed-text",
            },
  ),
}));

describe("useEndpointConfiguration rechecks on load", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({ endpoints: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks again on load a local endpoint whose embedding model was missing, or that could not be reached", async () => {
    // Persisted from an earlier visit: Ollama answered but lacked the
    // embedding model (the user has since run ollama pull), and LM Studio was
    // blocked by the browser (the user has since allowed local access).
    useStore.getState().addEndpoint("ollama");
    useStore.getState().addEndpoint("lmstudio", {
      baseURL: "http://localhost:1234/v1",
      embeddingModel: "nomic-embed-text",
    });
    useStore.getState().setEndpointStatus("ollama", "valid", {
      modelCount: 1,
      embeddingModelFound: false,
    });
    useStore.getState().setEndpointStatus("lmstudio", "invalid", {
      errorCode: "localBlocked",
    });
    vi.mocked(checkEndpoint).mockClear();

    renderHook(() => useEndpointConfiguration(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(useStore.getState().endpoints).toMatchObject([
      { id: "ollama", status: "valid", embeddingModelFound: true },
      { id: "lmstudio", status: "valid", embeddingModelFound: true },
    ]);
    expect(checkEndpoint).toHaveBeenCalledTimes(2);
  });

  it("checks a still missing embedding model only once per load", async () => {
    useStore.getState().addEndpoint("ollama", { embeddingModel: "other" });
    useStore.getState().setEndpointStatus("ollama", "valid", {
      modelCount: 1,
      embeddingModelFound: false,
    });
    vi.mocked(checkEndpoint).mockClear();

    renderHook(() => useEndpointConfiguration(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(checkEndpoint).toHaveBeenCalledTimes(1);
    expect(useStore.getState().endpoints[0]).toMatchObject({
      embeddingModelFound: false,
    });
  });
});
