import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useStore } from "~/store";
import { useEmbeddingsProviderSetting } from "../useEmbeddingsProviderSetting";

const originalMockMode = process.env.NEXT_PUBLIC_MOCK_MODE;

const statuses = (openai: string, google: string) => ({
  openai,
  anthropic: "valid",
  google,
  xai: "idle",
  deepseek: "idle",
  perplexity: "idle",
});

describe("useEmbeddingsProviderSetting", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    useStore.setState({ embeddingsProvider: "auto" });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_MODE = originalMockMode;
  });

  it("reports availability and the auto choice", () => {
    const { result } = renderHook(() =>
      useEmbeddingsProviderSetting(statuses("invalid", "valid")),
    );
    expect(result.current.value).toBe("auto");
    expect(result.current.available).toEqual({ openai: false, google: true });
    expect(result.current.activeProvider).toBe("google");
  });

  it("stores the override", () => {
    const { result } = renderHook(() =>
      useEmbeddingsProviderSetting(statuses("valid", "valid")),
    );
    act(() => result.current.onChange("google"));
    expect(useStore.getState().embeddingsProvider).toBe("google");
    expect(result.current.activeProvider).toBe("google");
  });

  it("maps a legacy stored provider to auto", () => {
    useStore.setState({ embeddingsProvider: "anthropic" as never });
    const { result } = renderHook(() =>
      useEmbeddingsProviderSetting(statuses("valid", "idle")),
    );
    expect(result.current.value).toBe("auto");
    expect(result.current.activeProvider).toBe("openai");
  });

  it("returns no provider without OpenAI or Google keys", () => {
    const { result } = renderHook(() =>
      useEmbeddingsProviderSetting(statuses("idle", "idle")),
    );
    expect(result.current.activeProvider).toBeNull();
  });

  it("follows the keys in mock mode too, so the no-provider message can be tested", () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "true";
    const { result } = renderHook(() =>
      useEmbeddingsProviderSetting(statuses("idle", "idle")),
    );
    expect(result.current.available).toEqual({ openai: false, google: false });
    expect(result.current.activeProvider).toBeNull();
  });
});
