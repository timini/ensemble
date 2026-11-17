import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query),
}));

import { useStore } from "~/store";
import { useOnboarding, type UseOnboardingOptions } from "../useOnboarding";

function options(
  overrides: Partial<UseOnboardingOptions> = {},
): UseOnboardingOptions {
  return {
    hasHydrated: true,
    keys: { canRun: false, hydratedStatuses: {}, onKeyChange: vi.fn() },
    endpoints: { items: [], onChange: vi.fn(), onRemove: vi.fn() },
    onOpenSettings: vi.fn(),
    ...overrides,
  };
}

describe("useOnboarding", () => {
  beforeEach(() => {
    replace.mockReset();
    query = "";
    useStore.setState(useStore.getInitialState(), true);
  });

  it("opens on the first visit, on the keys path", () => {
    const { result } = renderHook(() => useOnboarding(options()));
    expect(result.current.open).toBe(true);
    expect(result.current.path).toBe("keys");
  });

  it("waits for the store to load before deciding", () => {
    const { result, rerender } = renderHook(
      (o: UseOnboardingOptions) => useOnboarding(o),
      {
        initialProps: options({ hasHydrated: false }),
      },
    );
    expect(result.current.open).toBe(false);
    rerender(options());
    expect(result.current.open).toBe(true);
  });

  it("stays closed once done, when something is set up, or when a panel is asked for", () => {
    useStore.setState({ onboardingDone: true });
    expect(renderHook(() => useOnboarding(options())).result.current.open).toBe(
      false,
    );

    useStore.setState({ onboardingDone: false });
    query = "panel=settings";
    expect(renderHook(() => useOnboarding(options())).result.current.open).toBe(
      false,
    );

    query = "";
    useStore.getState().addEndpoint("ollama");
    expect(renderHook(() => useOnboarding(options())).result.current.open).toBe(
      false,
    );
  });

  it("opens on the path the landing page asked for, even after onboarding, unless the user can already run", () => {
    useStore.setState({ onboardingDone: true });
    query = "start=local";
    const { result } = renderHook(() => useOnboarding(options()));
    expect(result.current.open).toBe(true);
    expect(result.current.path).toBe("local");

    const ready = options({
      keys: { canRun: true, hydratedStatuses: {}, onKeyChange: vi.fn() },
    });
    expect(renderHook(() => useOnboarding(ready)).result.current.open).toBe(
      false,
    );
  });

  it("stores a typed key under the provider its prefix names, and shows the check as running", () => {
    const opts = options();
    const { result } = renderHook(() => useOnboarding(opts));
    act(() => result.current.keyField.onChange("sk-ant-test"));
    expect(result.current.keyField.provider).toBe("anthropic");
    expect(opts.keys.onKeyChange).toHaveBeenCalledWith(
      "anthropic",
      "sk-ant-test",
    );
    expect(result.current.keyField.status).toBe("validating");
  });

  it("adds an OpenRouter endpoint for an OpenRouter key, and removes it when the key is cleared", () => {
    const opts = options();
    const { result } = renderHook(() => useOnboarding(opts));
    act(() => result.current.keyField.onChange("sk-or-v1-test"));
    const endpoint = useStore
      .getState()
      .endpoints.find((e) => e.presetId === "openrouter");
    expect(endpoint).toBeDefined();
    expect(opts.endpoints.onChange).toHaveBeenCalledWith(
      endpoint!.id,
      "apiKey",
      "sk-or-v1-test",
    );
    act(() => result.current.keyField.onChange(""));
    expect(opts.endpoints.onRemove).toHaveBeenCalledWith(endpoint!.id);
  });

  it("moves the key when the provider is changed by hand", () => {
    const opts = options();
    const { result } = renderHook(() => useOnboarding(opts));
    act(() => result.current.keyField.onChange("sk-abc"));
    expect(opts.keys.onKeyChange).toHaveBeenLastCalledWith("openai", "sk-abc");
    act(() => result.current.keyField.onProviderChange("deepseek"));
    expect(opts.keys.onKeyChange).toHaveBeenCalledWith("openai", "");
    expect(opts.keys.onKeyChange).toHaveBeenLastCalledWith(
      "deepseek",
      "sk-abc",
    );
  });

  it("reports the provider's verdict on the key", () => {
    const keys = {
      canRun: true,
      hydratedStatuses: { openai: "invalid" },
      onKeyChange: vi.fn(),
    };
    useStore.setState({
      apiKeys: {
        ...useStore.getState().apiKeys,
        openai: {
          key: "sk-x",
          encrypted: null,
          visible: false,
          status: "invalid",
          error: "Invalid API key (401 Unauthorized)",
        },
      },
    });
    const { result } = renderHook(() => useOnboarding(options({ keys })));
    act(() => result.current.keyField.onChange("sk-proj-x"));
    expect(result.current.keyField.status).toBe("invalid");
    expect(result.current.keyField.error).toBe(
      "Invalid API key (401 Unauthorized)",
    );
  });

  it("names a connected local endpoint", () => {
    const endpoints = {
      items: [
        {
          id: "ollama",
          presetId: "ollama",
          label: "Ollama",
          baseURL: "",
          apiKey: "",
          embeddingModel: "",
          status: "valid",
          modelCount: 3,
          local: true,
          requiresKey: false,
        },
      ],
      onChange: vi.fn(),
      onRemove: vi.fn(),
    } as unknown as UseOnboardingOptions["endpoints"];
    const { result } = renderHook(() => useOnboarding(options({ endpoints })));
    expect(result.current.connected).toEqual({ name: "Ollama", models: 3 });
  });

  it("finishes on start or skip, drops start from the URL and does not open again", () => {
    query = "start=keys&mockErrors=x";
    const { result } = renderHook(() => useOnboarding(options()));
    act(() => result.current.onSkip());
    expect(result.current.open).toBe(false);
    expect(useStore.getState().onboardingDone).toBe(true);
    expect(replace).toHaveBeenCalledWith("/workspace?mockErrors=x");
  });

  it("opens settings from the local path and finishes onboarding", () => {
    const opts = options();
    const { result } = renderHook(() => useOnboarding(opts));
    act(() => result.current.onOpenSettings());
    expect(opts.onOpenSettings).toHaveBeenCalled();
    expect(result.current.open).toBe(false);
  });
});
