import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "~/lib/i18n";
import { sampleAnswers } from "@/components/organisms/AnswerColumns/fixtures";
import { RunResult, type RunResultProps } from "./RunResult";

function run(
  overrides: Partial<RunResultProps["run"]> = {},
): RunResultProps["run"] {
  return {
    prompt: "What is 6 times 7?",
    running: false,
    progress: { done: 3, total: 3 },
    agreement: { status: "ready", score: 0.9 },
    consensus: { status: "success", text: "42", method: "standard" },
    exclusion: {
      succeeded: 3,
      total: 3,
      failedModels: [],
      manualCount: 0,
      finished: true,
      agreementAvailable: true,
    },
    answers: sampleAnswers,
    ...overrides,
  };
}

describe("RunResult", () => {
  it("shows the run's question only when asked to", () => {
    const { rerender } = render(<RunResult run={run()} showPrompt />);
    expect(screen.getByTestId("run-prompt")).toHaveTextContent(
      "What is 6 times 7?",
    );
    rerender(<RunResult run={run()} showPrompt={false} />);
    expect(screen.queryByTestId("run-prompt")).not.toBeInTheDocument();
  });

  it("leaves out the answers when there are none", () => {
    render(<RunResult run={run({ answers: [] })} showPrompt={false} />);
    expect(screen.getByTestId("consensus-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("answer-columns")).not.toBeInTheDocument();
  });

  it("shows the agreement and consensus cards once the run has finished", () => {
    render(<RunResult run={run()} showPrompt={false} />);
    expect(screen.getByTestId("consensus-panel")).not.toHaveClass("hidden");
    expect(screen.queryByTestId("run-status-compact")).not.toBeInTheDocument();
  });

  it("swaps the cards for one status row on small screens while answers stream", () => {
    render(
      <RunResult
        run={run({
          running: true,
          progress: { done: 1, total: 3 },
          agreement: { status: "pending" },
          consensus: { status: "awaiting", method: "standard" },
        })}
        showPrompt={false}
      />,
    );
    const status = screen.getByTestId("run-status-compact");
    expect(status).toHaveTextContent(
      "1 of 3 answers in. Agreement and consensus follow.",
    );
    expect(status).toHaveClass("lg:hidden");
    const panel = screen.getByTestId("consensus-panel");
    expect(panel).toHaveClass("hidden");
    expect(panel).toHaveClass("lg:grid");
    expect(screen.getByTestId("answer-columns")).toBeInTheDocument();
  });
});
