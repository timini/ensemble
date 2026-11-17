import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "~/lib/i18n";
import { RunExclusionNote } from "./RunExclusionNote";

describe("RunExclusionNote", () => {
  it("renders nothing when no model failed", () => {
    const { container } = render(
      <RunExclusionNote succeeded={3} total={3} failedModels={[]} finished />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("says which models were left out and how many answers remain", () => {
    render(
      <RunExclusionNote
        succeeded={2}
        total={3}
        failedModels={["GPT-6 Luna"]}
        finished
      />,
    );
    const note = screen.getByTestId("run-exclusion-note");
    expect(note).toHaveTextContent("1 model failed");
    expect(note).toHaveTextContent("GPT-6 Luna");
    expect(note).toHaveTextContent("2 of 3");
  });

  it("explains why consensus cannot run with fewer than two answers", () => {
    render(
      <RunExclusionNote
        succeeded={1}
        total={2}
        failedModels={["GPT-6 Luna"]}
        finished
      />,
    );
    const note = screen.getByTestId("consensus-insufficient");
    expect(note).toHaveTextContent("at least 2 answers");
    expect(note).toHaveTextContent("1 of 2");
    expect(screen.queryByTestId("run-exclusion-note")).not.toBeInTheDocument();
  });

  it("counts manual answers towards the consensus minimum", () => {
    render(
      <RunExclusionNote
        succeeded={1}
        total={2}
        failedModels={["GPT-6 Luna"]}
        manualCount={1}
        finished
      />,
    );
    expect(
      screen.queryByTestId("consensus-insufficient"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("run-exclusion-note")).toBeInTheDocument();
  });

  it("waits for the run to finish before saying consensus cannot run", () => {
    render(
      <RunExclusionNote
        succeeded={0}
        total={2}
        failedModels={["GPT-6 Luna"]}
        finished={false}
      />,
    );
    expect(
      screen.queryByTestId("consensus-insufficient"),
    ).not.toBeInTheDocument();
  });

  it("renders French text", async () => {
    await i18n.changeLanguage("fr");
    render(
      <RunExclusionNote
        succeeded={1}
        total={2}
        failedModels={["GPT-6 Luna"]}
        finished
      />,
    );
    expect(screen.getByTestId("consensus-insufficient")).toHaveTextContent(
      "au moins 2 réponses",
    );
    await i18n.changeLanguage("en");
  });
});
