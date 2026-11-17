import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "~/store";
import { useOllamaDetection } from "../useOllamaDetection";

const detectOllama = vi.fn();
const permission = vi.fn();

vi.mock("@ensemble-ai/shared-utils/providers", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  detectOllama: (...args: unknown[]) => detectOllama(...args) as unknown,
}));

vi.mock("~/lib/localModels", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loopbackPermissionState: () => permission() as unknown,
}));

const FOUND = {
  found: true,
  url: "http://localhost:11434",
  baseURL: "http://localhost:11434/v1",
  models: ["llama3.2:3b", "qwen3:4b", "nomic-embed-text:latest"],
  chatModels: ["llama3.2:3b", "qwen3:4b"],
  embeddingModel: "nomic-embed-text:latest",
};

const LOCAL = "http://localhost:3000";
const HOSTED = "https://ensemble.example.app";

describe("useOllamaDetection", () => {
  const originalMock = process.env.NEXT_PUBLIC_MOCK_MODE;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    useStore.setState({ endpoints: [], ollamaOfferDismissed: false });
    detectOllama.mockReset();
    permission.mockReset().mockResolvedValue("prompt");
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_MODE = originalMock;
  });

  it("offers a running Ollama found from a local page, with its models", async () => {
    detectOllama.mockResolvedValue(FOUND);
    const { result } = renderHook(() =>
      useOllamaDetection({
        enabled: true,
        hasValidKey: false,
        pageOrigin: LOCAL,
      }),
    );
    await waitFor(() => expect(result.current?.state).toBe("found"));
    expect(result.current).toMatchObject({
      chatModels: ["llama3.2:3b", "qwen3:4b"],
      embeddingModel: "nomic-embed-text:latest",
      hosted: false,
      embeddingPullCommand: "ollama pull nomic-embed-text",
      probeUrl: "http://localhost:11434",
    });
    expect(detectOllama).toHaveBeenCalledWith({
      url: "http://localhost:11434",
    });
  });

  it("adds Ollama with what it found in one click", async () => {
    detectOllama.mockResolvedValue({
      ...FOUND,
      baseURL: "http://localhost:11499/v1",
    });
    const { result } = renderHook(() =>
      useOllamaDetection({
        enabled: true,
        hasValidKey: false,
        pageOrigin: LOCAL,
      }),
    );
    await waitFor(() => expect(result.current?.state).toBe("found"));
    act(() => result.current?.onAdd());
    expect(useStore.getState().endpoints[0]).toMatchObject({
      presetId: "ollama",
      baseURL: "http://localhost:11499/v1",
      embeddingModel: "nomic-embed-text:latest",
    });
    expect(result.current).toBeNull();
  });

  it("shows nothing when Ollama is absent", async () => {
    detectOllama.mockResolvedValue({ found: false });
    const { result } = renderHook(() =>
      useOllamaDetection({
        enabled: true,
        hasValidKey: false,
        pageOrigin: LOCAL,
      }),
    );
    await waitFor(() => expect(detectOllama).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("asks before looking from the hosted site without permission", async () => {
    detectOllama.mockResolvedValue({ found: false });
    const { result } = renderHook(() =>
      useOllamaDetection({
        enabled: true,
        hasValidKey: false,
        pageOrigin: HOSTED,
      }),
    );
    await waitFor(() => expect(result.current?.state).toBe("ask"));
    expect(detectOllama).not.toHaveBeenCalled();
    expect(result.current?.hosted).toBe(true);

    await act(async () => {
      result.current?.onCheck();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current?.state).toBe("notFound"));
    expect(detectOllama).toHaveBeenCalledTimes(1);
    // The click raises the browser's permission prompt, and the request waits
    // for the answer, so the check allows far longer than the 1.5 s default.
    expect(detectOllama).toHaveBeenCalledWith({
      url: "http://localhost:11434",
      timeoutMs: 30_000,
    });
  });

  it("stops asking once a key turns valid, and keeps the result of a check", async () => {
    detectOllama.mockResolvedValue({ found: false });
    const { result, rerender } = renderHook(
      ({ hasValidKey }) =>
        useOllamaDetection({ enabled: true, hasValidKey, pageOrigin: HOSTED }),
      { initialProps: { hasValidKey: false } },
    );
    await waitFor(() => expect(result.current?.state).toBe("ask"));
    rerender({ hasValidKey: true });
    await waitFor(() => expect(result.current).toBeNull());

    rerender({ hasValidKey: false });
    await waitFor(() => expect(result.current?.state).toBe("ask"));
    await act(async () => {
      result.current?.onCheck();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current?.state).toBe("notFound"));
    rerender({ hasValidKey: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current?.state).toBe("notFound");
  });

  it("looks from the hosted site once the browser granted local access", async () => {
    permission.mockResolvedValue("granted");
    detectOllama.mockResolvedValue(FOUND);
    const { result } = renderHook(() =>
      useOllamaDetection({
        enabled: true,
        hasValidKey: false,
        pageOrigin: HOSTED,
      }),
    );
    await waitFor(() => expect(result.current?.state).toBe("found"));
  });

  it("does not ask from the hosted site when the user already has a key or denied access", async () => {
    const withKey = renderHook(() =>
      useOllamaDetection({
        enabled: true,
        hasValidKey: true,
        pageOrigin: HOSTED,
      }),
    );
    permission.mockResolvedValue("denied");
    const denied = renderHook(() =>
      useOllamaDetection({
        enabled: true,
        hasValidKey: false,
        pageOrigin: HOSTED,
      }),
    );
    await waitFor(() => expect(permission).toHaveBeenCalledTimes(2));
    expect(withKey.result.current).toBeNull();
    expect(denied.result.current).toBeNull();
  });

  it("stays quiet once dismissed, once an endpoint exists, when disabled and in mock mode", async () => {
    detectOllama.mockResolvedValue(FOUND);
    const { result, unmount: unmountFirst } = renderHook(() =>
      useOllamaDetection({
        enabled: true,
        hasValidKey: false,
        pageOrigin: LOCAL,
      }),
    );
    await waitFor(() => expect(result.current?.state).toBe("found"));
    act(() => result.current?.onDismiss());
    expect(result.current).toBeNull();
    expect(useStore.getState().ollamaOfferDismissed).toBe(true);
    unmountFirst();

    detectOllama.mockClear();
    const quiet = async (enabled: boolean) => {
      const { result: r, unmount } = renderHook(() =>
        useOllamaDetection({ enabled, hasValidKey: false, pageOrigin: LOCAL }),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(r.current).toBeNull();
      unmount();
    };
    await quiet(true); // dismissed
    useStore.setState({ ollamaOfferDismissed: false });
    useStore.getState().addEndpoint("lmstudio");
    await quiet(true); // an endpoint exists
    useStore.setState({ endpoints: [] });
    await quiet(false); // disabled
    process.env.NEXT_PUBLIC_MOCK_MODE = "true";
    await quiet(true); // mock mode
    expect(detectOllama).not.toHaveBeenCalled();
  });
});
