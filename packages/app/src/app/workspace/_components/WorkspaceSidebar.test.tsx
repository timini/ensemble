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

  it("shows the stored run time, not the time the page loaded", () => {
    // Last week, so it must not be listed under Today.
    const startedAt = Date.now() - 5 * 86_400_000;
    useStore.setState({ runStartedAt: startedAt });
    render(
      <WorkspaceSidebar
        runPrompt="What is 6 times 7?"
        agreement={{ status: "pending" }}
        onNewQuestion={() => undefined}
        onDone={() => undefined}
      />,
    );
    expect(
      screen.queryByRole("region", { name: "Today" }),
    ).not.toBeInTheDocument();
    const weekday = new Intl.DateTimeFormat("en", { weekday: "short" }).format(
      startedAt,
    );
    expect(screen.getByTestId("history-item")).toHaveTextContent(weekday);
  });

  it("lists a run with no stored time with no date or time", () => {
    useStore.setState({ runStartedAt: null });
    render(
      <WorkspaceSidebar
        runPrompt="Older run"
        agreement={{ status: "pending" }}
        onNewQuestion={() => undefined}
        onDone={() => undefined}
      />,
    );
    expect(
      screen.queryByRole("region", { name: "Today" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("history-item").textContent).not.toMatch(
      /\d{1,2}:\d{2}/,
    );
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

  describe("with stored runs", () => {
    const stored = (id: string, prompt: string, createdAt: number) => ({
      id,
      createdAt,
      prompt,
      models: [{ id: "a", provider: "openai" as const, model: "gpt-6-astra" }],
      consensusMethod: "standard" as const,
      summarizerModel: null,
      responses: [
        {
          modelId: "a",
          provider: "openai" as const,
          model: "gpt-6-astra",
          response: "About seventy-one degrees",
          isStreaming: false,
          isComplete: true,
          responseTime: 1,
          tokenCount: 1,
          error: null,
        },
      ],
      manualResponses: [],
      embeddings: [],
      embeddingsSource: null,
      similarityMatrix: null,
      agreementStats: null,
      metaAnalysis: "Consensus text",
      majorityVote: null,
      consensusUsage: [],
      agreementScore: 0.2,
      agreementLevel: "low" as const,
      costUsd: 0.01,
    });
    const now = Date.now();
    const runs = [
      stored("run-2", "Second", now - 1000),
      stored("run-1", "First", now - 2000),
    ];

    function renderWithRuns(overrides: Record<string, unknown> = {}) {
      const props = {
        runPrompt: "Second",
        agreement: { status: "pending" as const },
        onNewQuestion: vi.fn(),
        onDone: vi.fn(),
        runs,
        currentId: "run-2",
        onOpenRun: vi.fn(),
        onDeleteRun: vi.fn(),
        ...overrides,
      };
      render(<WorkspaceSidebar {...props} />);
      return props;
    }

    it("lists every stored run with its stored agreement level", () => {
      renderWithRuns();
      const items = screen.getAllByTestId("history-item");
      expect(items).toHaveLength(2);
      expect(items[1]).toHaveTextContent("First");
      expect(items[1]).toHaveTextContent("Low agreement");
    });

    it("adds the run on screen while it is not stored yet", () => {
      useStore.setState({ runStartedAt: now });
      renderWithRuns({ runPrompt: "Third, still running", currentId: "run-3" });
      expect(screen.getAllByTestId("history-item")).toHaveLength(3);
      expect(screen.getAllByTestId("history-item")[0]).toHaveTextContent(
        "Third, still running",
      );
    });

    it("opens another run and closes the sheet", () => {
      const props = renderWithRuns();
      fireEvent.click(screen.getByText("First"));
      expect(props.onOpenRun).toHaveBeenCalledWith("run-1");
      expect(props.onDone).toHaveBeenCalled();
    });

    it("does not reopen the run already on screen", () => {
      const props = renderWithRuns();
      fireEvent.click(screen.getByText("Second"));
      expect(props.onOpenRun).not.toHaveBeenCalled();
      expect(props.onDone).toHaveBeenCalled();
    });

    it("deletes a stored run", () => {
      const props = renderWithRuns();
      fireEvent.click(screen.getByRole("button", { name: 'Delete "First"' }));
      expect(props.onDeleteRun).toHaveBeenCalledWith("run-1");
    });

    it("finds a run by its answers and model names", () => {
      renderWithRuns();
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "seventy" },
      });
      expect(screen.getAllByTestId("history-item")).toHaveLength(2);
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "astra" },
      });
      expect(screen.getAllByTestId("history-item")).toHaveLength(2);
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "First" },
      });
      expect(screen.getAllByTestId("history-item")).toHaveLength(1);
    });
  });
});
