import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "~/store";
import { useEndpointConfiguration } from "../useEndpointConfiguration";

vi.mock("~/lib/endpointValidation", () => ({
  checkEndpoint: vi.fn(async (endpoint: { baseURL: string }) =>
    endpoint.baseURL.includes("down")
      ? { status: "invalid", error: "Failed to fetch" }
      : { status: "valid", modelCount: 2 },
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
