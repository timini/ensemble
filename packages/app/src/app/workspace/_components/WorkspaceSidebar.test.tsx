import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "~/lib/i18n";
import { useStore } from "~/store";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

const preset = {
  id: "p1",
  name: "Quick pair",
  description: "",
  models: [
    { id: "a", provider: "openai" as const, model: "gpt-6-astra" },
    { id: "b", provider: "openai" as const, model: "gpt-6-luna" },
  ],
  summarizer: "gpt-6-luna",
  consensusMethod: "majority" as const,
  eloTopN: 3,
};

describe("WorkspaceSidebar", () => {
  beforeEach(() => {
    useStore.setState({ savedEnsembles: [preset], selectedModels: [] });
  });

  it("lists the run on screen with its agreement level", () => {
    render(
      <WorkspaceSidebar
        runPrompt="What is 6 times 7?"
        agreement={{ status: "ready", score: 0.95 }}
        onNewQuestion={() => undefined}
        onDone={() => undefined}
      />,
    );
    const item = screen.getByTestId("history-item");
    expect(item).toHaveTextContent("What is 6 times 7?");
    expect(item).toHaveTextContent("High agreement");
  });

  it("shows no history without a run", () => {
    render(
      <WorkspaceSidebar
        runPrompt={null}
        agreement={{ status: "pending" }}
        onNewQuestion={() => undefined}
        onDone={() => undefined}
      />,
    );
    expect(screen.queryByTestId("history-item")).not.toBeInTheDocument();
    expect(screen.getByTestId("history-empty")).toBeInTheDocument();
  });

  it("loads a preset into the ensemble and closes", () => {
    const onDone = vi.fn();
    render(
      <WorkspaceSidebar
        runPrompt={null}
        agreement={{ status: "pending" }}
        onNewQuestion={() => undefined}
        onDone={onDone}
      />,
    );
    expect(screen.getByTestId("history-preset")).toHaveTextContent("2 models");
    fireEvent.click(screen.getByRole("button", { name: /^Quick pair/ }));
    expect(useStore.getState().selectedModels).toEqual(preset.models);
    expect(useStore.getState().consensusMethod).toBe("majority");
    expect(onDone).toHaveBeenCalled();
  });

  it("deletes a preset", () => {
    render(
      <WorkspaceSidebar
        runPrompt={null}
        agreement={{ status: "pending" }}
        onNewQuestion={() => undefined}
        onDone={() => undefined}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete preset Quick pair" }),
    );
    expect(useStore.getState().savedEnsembles).toEqual([]);
  });

  it("starts a new question and closes", () => {
    const onNewQuestion = vi.fn();
    const onDone = vi.fn();
    render(
      <WorkspaceSidebar
        runPrompt="Q"
        agreement={{ status: "pending" }}
        onNewQuestion={onNewQuestion}
        onDone={onDone}
      />,
    );
    fireEvent.click(screen.getByTestId("history-new"));
    expect(onNewQuestion).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });
});
