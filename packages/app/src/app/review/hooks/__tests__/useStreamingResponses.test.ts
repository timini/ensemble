import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const streamResponse = vi.fn();
vi.mock("~/providers", () => ({ initializeProviders: vi.fn() }));
vi.mock("@ensemble-ai/shared-utils/providers", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    ProviderRegistry: {
      getInstance: () => ({
        hasProvider: () => true,
        getProvider: () => ({ streamResponse }),
      }),
    },
  };
});

import { useStore } from "~/store";
import { useStreamingResponses } from "../useStreamingResponses";

const models = [
  {
    id: "a",
    provider: "openai" as const,
    model: "gpt-4o",
    isSummarizer: false,
  },
  {
    id: "b",
    provider: "openai" as const,
    model: "gpt-4o-mini",
    isSummarizer: false,
  },
];

describe("useStreamingResponses", () => {
  beforeEach(() => {
    push.mockReset();
    streamResponse.mockReset();
    // Answers finish at once, as a completed run would.
    streamResponse.mockImplementation(
      async (
        _prompt: string,
        _model: string,
        _onChunk: (c: string) => void,
        onComplete: (full: string, ms: number) => void,
      ) => {
        onComplete("done", 1);
      },
    );
    useStore.setState({
      selectedModels: models,
      responses: [],
      apiKeys: {
        ...useStore.getState().apiKeys,
        openai: { key: "sk-test", status: "valid" },
      },
    } as never);
  });

  afterEach(() => {
    useStore.getState().clearResponses();
  });

  it("streams every selected model once for a submitted run", async () => {
    await act(async () => {
      renderHook(() =>
        useStreamingResponses({ hasHydrated: true, prompt: "Q", mode: "free" }),
      );
    });
    expect(streamResponse).toHaveBeenCalledTimes(2);
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects to /prompt when there is no run", async () => {
    await act(async () => {
      renderHook(() =>
        useStreamingResponses({
          hasHydrated: true,
          prompt: null,
          mode: "free",
        }),
      );
    });
    expect(push).toHaveBeenCalledWith("/prompt");
    expect(streamResponse).not.toHaveBeenCalled();
  });

  it("starts nothing and does not redirect when the page resets the run before leaving", async () => {
    let prompt: string | null = "Q";
    const hook = renderHook(() =>
      useStreamingResponses({ hasHydrated: true, prompt, mode: "free" }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(streamResponse).toHaveBeenCalledTimes(2);

    // "New comparison": the run is reset, so the prompt the hook sees changes
    // (to the draft, or to null) while the page is still mounted.
    await act(async () => {
      useStore.getState().resetStreamingState();
      prompt = "Q ";
      hook.rerender();
    });
    await act(async () => {
      prompt = null;
      hook.rerender();
    });

    expect(streamResponse).toHaveBeenCalledTimes(2);
    expect(push).not.toHaveBeenCalled();
  });
});
