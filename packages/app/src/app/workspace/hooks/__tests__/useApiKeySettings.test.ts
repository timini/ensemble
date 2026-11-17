import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const validateApiKey = vi.fn<(options: unknown) => void>();
vi.mock("~/lib/validation", () => ({
  validateApiKey: (options: unknown) => validateApiKey(options),
  createDebouncedValidator:
    () =>
    (
      provider: string,
      value: string,
      _mode: string,
      onStatusChange: (p: string, s: string) => void,
    ) =>
      setTimeout(() => onStatusChange(provider, value ? "valid" : "idle"), 100),
}));

import { useStore } from "~/store";
import { useApiKeySettings } from "../useApiKeySettings";

const noKeys = {
  openai: null,
  anthropic: null,
  google: null,
  xai: null,
  deepseek: null,
  perplexity: null,
};

describe("useApiKeySettings", () => {
  beforeEach(() => {
    validateApiKey.mockReset();
    useStore.setState({ apiKeys: { ...noKeys }, endpoints: [] } as never);
  });

  it("lists one field per key provider and cannot run without a key", () => {
    const { result } = renderHook(() => useApiKeySettings());
    expect(result.current.items.map((i) => i.provider)).toEqual([
      "openai",
      "anthropic",
      "google",
      "xai",
      "deepseek",
      "perplexity",
    ]);
    expect(result.current.canRun).toBe(false);
    expect(result.current.validKeyCount).toBe(0);
  });

  it("can run once a key is valid", async () => {
    const { result } = renderHook(() => useApiKeySettings());
    await act(async () => {
      result.current.onKeyChange("openai", "sk-test");
      await vi.waitFor(() => {
        expect(useStore.getState().apiKeys.openai?.status).toBe("valid");
      });
    });
    expect(result.current.validKeyCount).toBe(1);
    expect(result.current.canRun).toBe(true);
  });

  it("can run with a connected endpoint and no key", () => {
    useStore.setState({
      endpoints: [{ id: "ollama", status: "valid" }],
    } as never);
    const { result } = renderHook(() => useApiKeySettings());
    expect(result.current.canRun).toBe(true);
  });

  it("validates a stored key that was never checked", () => {
    useStore.setState({
      apiKeys: { ...noKeys, google: { key: "g-key", status: "idle" } },
    } as never);
    renderHook(() => useApiKeySettings());
    expect(validateApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google", apiKey: "g-key" }),
    );
  });
});
