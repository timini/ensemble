import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "~/store";
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

describe("useEndpointConfiguration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({ endpoints: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers every preset", () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    expect(result.current.presets.map((p) => p.id)).toEqual([
      "ollama",
      "lmstudio",
      "llamacpp",
      "vllm",
      "openrouter",
      "groq",
      "together",
      "custom",
    ]);
  });

  it("adds an endpoint and checks it", async () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    act(() => result.current.onAdd("ollama"));
    expect(result.current.items[0]).toMatchObject({
      id: "ollama",
      local: true,
      requiresKey: false,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(useStore.getState().endpoints[0]).toMatchObject({
      status: "valid",
      modelCount: 2,
    });
  });

  it("checks again after the base URL changes", async () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    act(() => result.current.onAdd("custom"));
    act(() =>
      result.current.onChange("custom", "baseURL", "http://down.example/v1"),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(useStore.getState().endpoints[0]).toMatchObject({
      status: "invalid",
      error: "Failed to fetch",
    });
  });

  it("shows the Local badge only for a local preset at a loopback URL", () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    act(() => result.current.onAdd("vllm"));
    expect(result.current.items[0]).toMatchObject({ local: true });
    act(() =>
      result.current.onChange("vllm", "baseURL", "https://gpu.example.com/v1"),
    );
    expect(result.current.items[0]).toMatchObject({ local: false });
  });

  it("checks again after the embedding model changes", async () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    act(() => result.current.onAdd("ollama"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(useStore.getState().endpoints[0]).toMatchObject({
      embeddingModelFound: true,
    });
    act(() => result.current.onChange("ollama", "embeddingModel", "missing"));
    expect(
      useStore.getState().endpoints[0]?.embeddingModelFound,
    ).toBeUndefined();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(useStore.getState().endpoints[0]).toMatchObject({
      status: "valid",
      embeddingModelFound: false,
    });
  });

  it("switches a local endpoint to the embedding model it has when the default is missing", async () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    act(() => result.current.onAdd("ollama"));
    act(() =>
      result.current.onChange(
        "ollama",
        "baseURL",
        "http://localhost:1/gemma/v1",
      ),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(useStore.getState().endpoints[0]).toMatchObject({
      status: "valid",
      embeddingModel: "embeddinggemma",
      embeddingModelFound: true,
    });
  });

  it("keeps an embedding model the user typed, even when the server lacks it", async () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    act(() => result.current.onAdd("ollama"));
    act(() =>
      result.current.onChange(
        "ollama",
        "baseURL",
        "http://localhost:1/gemma/v1",
      ),
    );
    act(() =>
      result.current.onChange("ollama", "embeddingModel", "mxbai-embed-large"),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(useStore.getState().endpoints[0]).toMatchObject({
      embeddingModel: "mxbai-embed-large",
      embeddingModelFound: false,
    });
  });

  it("does not pick an embedding model on a hosted endpoint", async () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    act(() => result.current.onAdd("custom"));
    act(() =>
      result.current.onChange("custom", "baseURL", "https://gemma.example/v1"),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(useStore.getState().endpoints[0]).toMatchObject({
      embeddingModel: "",
      embeddingModelFound: false,
    });
  });

  it("removes an endpoint", () => {
    const { result } = renderHook(() => useEndpointConfiguration(true));
    act(() => result.current.onAdd("groq"));
    act(() => result.current.onRemove("groq"));
    expect(useStore.getState().endpoints).toEqual([]);
  });

  it("shows nothing when disabled", () => {
    useStore.getState().addEndpoint("ollama");
    const { result } = renderHook(() => useEndpointConfiguration(false));
    expect(result.current.items).toEqual([]);
  });
});
