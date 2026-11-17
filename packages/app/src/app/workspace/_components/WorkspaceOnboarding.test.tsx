import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "~/lib/i18n";
import { WorkspaceOnboarding } from "./WorkspaceOnboarding";
import type { useOnboarding } from "../hooks/useOnboarding";

function onboarding(
  overrides: Partial<ReturnType<typeof useOnboarding>> = {},
): ReturnType<typeof useOnboarding> {
  return {
    open: true,
    path: "local",
    onPathChange: vi.fn(),
    keyField: {
      provider: "openrouter",
      onProviderChange: vi.fn(),
      value: "",
      onChange: vi.fn(),
      status: "idle",
    },
    connected: undefined,
    canStart: false,
    onStart: vi.fn(),
    onSkip: vi.fn(),
    onOpenChange: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };
}

const offer = {
  state: "found" as const,
  chatModels: ["llama3.2:3b"],
  embeddingModel: "nomic-embed-text",
  embeddingPullCommand: "ollama pull nomic-embed-text",
  chatPullCommand: "ollama pull llama3.2:3b",
  hosted: false,
  localRunCommand: "npm run local",
  probeUrl: "http://localhost:11434",
  onAdd: vi.fn(),
  onCheck: vi.fn(),
  onDismiss: vi.fn(),
};

describe("WorkspaceOnboarding", () => {
  it("shows the Ollama offer on the local path", () => {
    render(
      <WorkspaceOnboarding onboarding={onboarding()} ollamaOffer={offer} />,
    );
    expect(screen.getByTestId("ollama-notice")).toBeInTheDocument();
  });

  it("starts and focuses the question", async () => {
    const prompt = document.createElement("textarea");
    prompt.dataset.testid = "composer-prompt";
    document.body.append(prompt);
    const state = onboarding({ canStart: true });
    const { rerender } = render(
      <WorkspaceOnboarding onboarding={state} ollamaOffer={null} />,
    );
    fireEvent.click(screen.getByTestId("onboarding-start"));
    expect(state.onStart).toHaveBeenCalled();
    rerender(
      <WorkspaceOnboarding
        onboarding={{ ...state, open: false }}
        ollamaOffer={null}
      />,
    );
    await waitFor(() => expect(document.activeElement).toBe(prompt));
    prompt.remove();
  });
});
